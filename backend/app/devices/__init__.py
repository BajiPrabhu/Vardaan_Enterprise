from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.auth.decorators import role_required
from app.extensions import db
from app.models import Device, Vehicle

devices_bp = Blueprint("devices", __name__, url_prefix="/api")

DEVICE_TYPES = {
    "raspberry_pi",
    "raspberry_pi_camera",
    "dash_cam",
    "gps_module",
    "rfid_reader",
    "uhf_rfid_reader",
    "alcohol_sensor",
    "pulse_sensor",
    "temperature_sensor",
    "humidity_sensor",
    "relay_module",
    "proximity_sensor",
    "ultrasonic_sensor",
}

# Matches StatusDot's four states on the frontend exactly, so the API
# never has to translate between "what the device reports" and "what the
# UI can draw."
STATUSES = {"online", "offline", "warning", "critical"}

# The spec names maintenance_engineer as the role that "manages vehicle
# and device maintenance" — deliberately not the same write roles as
# Fleet, not copy-pasted from there.
WRITE_ROLES = ("owner", "administrator", "maintenance_engineer")


@devices_bp.route("/devices", methods=["GET"])
@jwt_required()
def list_devices():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")
    device_type = request.args.get("device_type")

    query = Device.query
    if status:
        query = query.filter_by(status=status)
    if device_type:
        query = query.filter_by(device_type=device_type)

    pagination = query.order_by(Device.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        items=[d.to_dict() for d in pagination.items],
        total=pagination.total,
        page=pagination.page,
        per_page=pagination.per_page,
    )


@devices_bp.route("/devices/<int:device_id>", methods=["GET"])
@jwt_required()
def get_device(device_id):
    device = db.session.get(Device, device_id)
    if not device:
        return jsonify(error="Device not found"), 404
    return jsonify(device.to_dict())


@devices_bp.route("/devices", methods=["POST"])
@role_required(*WRITE_ROLES)
def create_device():
    data = request.get_json(silent=True) or {}
    device_type = data.get("device_type")

    if not device_type:
        return jsonify(error="device_type is required"), 400
    if device_type not in DEVICE_TYPES:
        return jsonify(error=f"device_type must be one of {sorted(DEVICE_TYPES)}"), 400

    status = data.get("status", "offline")
    if status not in STATUSES:
        return jsonify(error=f"status must be one of {sorted(STATUSES)}"), 400

    vehicle_id = data.get("vehicle_id") or None
    if vehicle_id and not db.session.get(Vehicle, vehicle_id):
        return jsonify(error="vehicle_id does not exist"), 400

    device = Device(
        device_type=device_type,
        hardware_model=data.get("hardware_model") or None,
        firmware_version=data.get("firmware_version") or None,
        status=status,
        ip_address=data.get("ip_address") or None,
        vehicle_id=vehicle_id,
    )
    db.session.add(device)
    db.session.commit()

    return jsonify(device.to_dict()), 201


@devices_bp.route("/devices/<int:device_id>", methods=["PATCH"])
@role_required(*WRITE_ROLES)
def update_device(device_id):
    device = db.session.get(Device, device_id)
    if not device:
        return jsonify(error="Device not found"), 404

    data = request.get_json(silent=True) or {}

    if "device_type" in data:
        if data["device_type"] not in DEVICE_TYPES:
            return jsonify(
                error=f"device_type must be one of {sorted(DEVICE_TYPES)}"
            ), 400
        device.device_type = data["device_type"]

    if "status" in data:
        if data["status"] not in STATUSES:
            return jsonify(error=f"status must be one of {sorted(STATUSES)}"), 400
        device.status = data["status"]

    if "vehicle_id" in data:
        vehicle_id = data["vehicle_id"] or None
        if vehicle_id and not db.session.get(Vehicle, vehicle_id):
            return jsonify(error="vehicle_id does not exist"), 400
        device.vehicle_id = vehicle_id

    for field in ("hardware_model", "firmware_version", "ip_address"):
        if field in data:
            setattr(device, field, data[field] or None)

    db.session.commit()
    return jsonify(device.to_dict())


@devices_bp.route("/devices/<int:device_id>", methods=["DELETE"])
@role_required(*WRITE_ROLES)
def delete_device(device_id):
    device = db.session.get(Device, device_id)
    if not device:
        return jsonify(error="Device not found"), 404

    db.session.delete(device)
    db.session.commit()
    return "", 204
