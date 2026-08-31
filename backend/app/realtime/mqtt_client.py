import json
import logging
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.extensions import db, socketio
from app.models import Alert, Device

logger = logging.getLogger(__name__)

TELEMETRY_TOPIC = "vardaan/devices/+/telemetry"
VALID_STATUSES = {"online", "offline", "warning", "critical"}


def start_mqtt_client(app):
    """Connect to the broker and start consuming telemetry in a background
    thread. Every message handler runs inside `app.app_context()` — the
    paho-mqtt network loop is its own thread, with no Flask request context
    of its own, so nothing here can touch `db.session` or `socketio.emit`
    without one.
    """

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            client.subscribe(TELEMETRY_TOPIC)
            logger.info("MQTT connected, subscribed to %s", TELEMETRY_TOPIC)
        else:
            logger.warning("MQTT connect failed: %s", reason_code)

    def on_message(client, userdata, msg):
        with app.app_context():
            _handle_telemetry(msg.topic, msg.payload)

    def on_disconnect(client, userdata, flags, reason_code, properties):
        logger.warning("MQTT disconnected: %s", reason_code)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    try:
        client.connect(
            app.config["MQTT_BROKER_HOST"], app.config["MQTT_BROKER_PORT"], keepalive=30
        )
    except (ConnectionRefusedError, OSError) as exc:
        # No broker running — the rest of the app still works fine without
        # live telemetry, so this logs and moves on rather than crashing
        # app startup over an optional piece.
        logger.warning(
            "Could not reach MQTT broker at %s:%s (%s) — live telemetry is "
            "off until it's running. Everything else still works.",
            app.config["MQTT_BROKER_HOST"],
            app.config["MQTT_BROKER_PORT"],
            exc,
        )
        return None

    client.loop_start()
    return client


def _handle_telemetry(topic, raw_payload):
    parts = topic.split("/")
    # vardaan / devices / {id} / telemetry
    if len(parts) != 4 or not parts[2].isdigit():
        logger.warning("Ignoring telemetry on unexpected topic: %s", topic)
        return
    device_id = int(parts[2])

    try:
        payload = json.loads(raw_payload)
    except (TypeError, ValueError):
        logger.warning("Ignoring non-JSON telemetry on %s", topic)
        return

    status = payload.get("status")
    if status not in VALID_STATUSES:
        logger.warning("Ignoring telemetry with invalid status: %r", status)
        return

    device = db.session.get(Device, device_id)
    if not device:
        # Simulator or a real device publishing for something that's since
        # been deleted from Fleet/Devices — not an error, just stale.
        return

    previous_status = device.status
    reading = payload.get("reading")

    device.status = status
    device.last_heartbeat = datetime.now(timezone.utc)

    alert = _maybe_create_alert(device, previous_status, status, reading)

    db.session.commit()

    event = device.to_dict()
    event["reading"] = reading
    socketio.emit("device:update", event)

    if alert:
        socketio.emit("alert:new", alert.to_dict())


def _maybe_create_alert(device, previous_status, new_status, reading):
    """Only the moment a device crosses INTO a worse state is alert-worthy
    — a device that's been sitting at critical for ten straight messages
    should be one alert, not ten."""
    if previous_status == new_status:
        return None

    alert_type = severity = message = None

    if reading and reading.get("type") == "alcohol_level" and new_status == "critical":
        alert_type, severity = "alcohol_detected", "critical"
        message = f"Alcohol reading {reading['value']}{reading.get('unit', '')} on device #{device.id}"
    elif reading and reading.get("type") == "pulse" and new_status == "critical":
        alert_type, severity = "high_pulse", "critical"
        message = f"Pulse {reading['value']} {reading.get('unit', '')} on device #{device.id}"
    elif new_status == "critical":
        alert_type, severity = "device_critical", "critical"
        message = f"{device.device_type} #{device.id} went critical"
    elif new_status == "offline":
        alert_type, severity = "device_offline", "warning"
        message = f"{device.device_type} #{device.id} went offline"
    else:
        return None

    alert = Alert(
        device_id=device.id,
        device_type=device.device_type,
        alert_type=alert_type,
        severity=severity,
        message=message,
        reading=reading,
    )
    db.session.add(alert)
    return alert
