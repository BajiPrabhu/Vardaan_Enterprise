"""Publishes fake sensor telemetry over MQTT for every Device already in
the database, standing in for real Raspberry Pi / sensor hardware until
that gets wired up in a later phase. Needs a running MQTT broker and at
least one device (add one on the Devices page, or run seed.py).

    python simulate.py
"""

import os

# Must happen before `from app import create_app` — Config reads this env
# var once, at import time, so setting it any later (even at the top of
# main()) would be too late and this process would end up running its own
# redundant MQTT subscriber alongside the one it's supposed to be feeding.
os.environ["MQTT_ENABLED"] = "false"

import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app import create_app
from app.models import Device

INTERVAL_SECONDS = 4

# One simulated status per device, persisted across cycles so it drifts
# gradually instead of flickering randomly every publish.
_device_status = {}

READING_GENERATORS = {
    "alcohol_sensor": lambda: {
        "type": "alcohol_level",
        "value": round(random.uniform(0.0, 0.02), 3),
        "unit": "%BAC",
    },
    "pulse_sensor": lambda: {
        "type": "pulse",
        # Mostly a normal resting range; a small chance of a spike into
        # alert territory — mirrors how the alcohol reading works below.
        "value": random.randint(130, 155) if random.random() < 0.1 else random.randint(62, 96),
        "unit": "bpm",
    },
    "temperature_sensor": lambda: {
        "type": "temperature",
        "value": round(random.uniform(22, 41), 1),
        "unit": "°C",
    },
    "humidity_sensor": lambda: {
        "type": "humidity",
        "value": round(random.uniform(30, 70), 1),
        "unit": "%",
    },
    # Roughly Jaipur, with a small random walk each cycle.
    "gps_module": lambda: {
        "type": "location",
        "value": {
            "lat": round(26.9124 + random.uniform(-0.05, 0.05), 5),
            "lng": round(75.7873 + random.uniform(-0.05, 0.05), 5),
        },
    },
}


def _next_status(current):
    """Mostly stays put; occasionally drifts to a neighboring state and
    back, so watching the UI actually shows something changing instead of
    a wall of constant green."""
    roll = random.random()

    if current == "online":
        return random.choice(["warning", "offline"]) if roll < 0.08 else "online"

    if current in ("warning", "critical"):
        if roll < 0.45:
            return "online"
        if roll < 0.55:
            return "critical" if current == "warning" else "offline"
        return current

    if current == "offline":
        return "online" if roll < 0.3 else "offline"

    return "online"


def build_payload(device):
    key = device.id
    status = _next_status(_device_status.get(key, "online"))
    _device_status[key] = status

    payload = {"status": status, "timestamp": datetime.now(timezone.utc).isoformat()}

    generator = READING_GENERATORS.get(device.device_type)
    if generator and status != "offline":
        payload["reading"] = generator()

    # A real alcohol trip or a genuine high-pulse reading forces critical
    # regardless of the random walk — these are the two readings where the
    # number itself should drive status, not the other way around.
    reading = payload.get("reading")
    if reading and reading["type"] == "alcohol_level" and reading["value"] > 0.015:
        payload["status"] = status = "critical"
        _device_status[key] = status
    elif reading and reading["type"] == "pulse" and reading["value"] > 120:
        payload["status"] = status = "critical"
        _device_status[key] = status

    return payload


def main():
    app = create_app()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(app.config["MQTT_BROKER_HOST"], app.config["MQTT_BROKER_PORT"], keepalive=30)
    client.loop_start()

    print(
        f"Publishing simulated telemetry to "
        f"{app.config['MQTT_BROKER_HOST']}:{app.config['MQTT_BROKER_PORT']} "
        f"every {INTERVAL_SECONDS}s. Ctrl+C to stop."
    )

    try:
        while True:
            with app.app_context():
                devices = Device.query.all()
                if not devices:
                    print("No devices registered yet — add some on the Devices page first.")
                for device in devices:
                    payload = build_payload(device)
                    topic = f"vardaan/devices/{device.id}/telemetry"
                    client.publish(topic, json.dumps(payload))
                    print(f"  {topic} -> {payload['status']}", end="")
                    if payload.get("reading"):
                        print(f" ({payload['reading']['type']}: {payload['reading']['value']})", end="")
                    print()
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
