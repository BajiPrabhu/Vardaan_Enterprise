from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.auth.decorators import role_required
from app.extensions import db
from app.models import Driver, Vehicle

fleet_bp = Blueprint("fleet", __name__, url_prefix="/api/fleet")

STATUSES = {"active", "inactive", "in_trip", "maintenance", "out_of_service"}

# Reading the fleet list is open to any authenticated role for now — there's
# no per-driver filtering yet (a driver seeing only their own vehicle is a
# reasonable next refinement once there's more than one module to pattern
# it against). Writes are restricted from day one, since those have real
# consequences today.
WRITE_ROLES = ("owner", "administrator", "fleet_manager")


def _parse_date(value, field):
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be an ISO date (YYYY-MM-DD)")


@fleet_bp.route("/vehicles", methods=["GET"])
@jwt_required()
def list_vehicles():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")

    query = Vehicle.query
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(Vehicle.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        items=[v.to_dict() for v in pagination.items],
        total=pagination.total,
        page=pagination.page,
        per_page=pagination.per_page,
    )


@fleet_bp.route("/vehicles/<int:vehicle_id>", methods=["GET"])
@jwt_required()
def get_vehicle(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    return jsonify(vehicle.to_dict())


@fleet_bp.route("/vehicles", methods=["POST"])
@role_required(*WRITE_ROLES)
def create_vehicle():
    data = request.get_json(silent=True) or {}
    registration_number = (data.get("registration_number") or "").strip()

    if not registration_number:
        return jsonify(error="registration_number is required"), 400

    if Vehicle.query.filter_by(registration_number=registration_number).first():
        return jsonify(
            error="A vehicle with that registration number already exists"
        ), 409

    status = data.get("status", "inactive")
    if status not in STATUSES:
        return jsonify(error=f"status must be one of {sorted(STATUSES)}"), 400

    assigned_driver_id = data.get("assigned_driver_id") or None
    if assigned_driver_id and not db.session.get(Driver, assigned_driver_id):
        return jsonify(error="assigned_driver_id does not exist"), 400

    try:
        vehicle = Vehicle(
            registration_number=registration_number,
            vin=data.get("vin") or None,
            model=data.get("model") or None,
            manufacturer=data.get("manufacturer") or None,
            status=status,
            assigned_driver_id=assigned_driver_id,
            insurance_expiry=_parse_date(data.get("insurance_expiry"), "insurance_expiry"),
            fitness_expiry=_parse_date(data.get("fitness_expiry"), "fitness_expiry"),
            pollution_expiry=_parse_date(data.get("pollution_expiry"), "pollution_expiry"),
        )
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    db.session.add(vehicle)
    db.session.commit()

    return jsonify(vehicle.to_dict()), 201


@fleet_bp.route("/vehicles/<int:vehicle_id>", methods=["PATCH"])
@role_required(*WRITE_ROLES)
def update_vehicle(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404

    data = request.get_json(silent=True) or {}

    if "registration_number" in data:
        new_reg = (data["registration_number"] or "").strip()
        if not new_reg:
            return jsonify(error="registration_number cannot be empty"), 400
        clash = Vehicle.query.filter_by(registration_number=new_reg).first()
        if clash and clash.id != vehicle.id:
            return jsonify(
                error="A vehicle with that registration number already exists"
            ), 409
        vehicle.registration_number = new_reg

    if "status" in data:
        if data["status"] not in STATUSES:
            return jsonify(error=f"status must be one of {sorted(STATUSES)}"), 400
        vehicle.status = data["status"]

    if "assigned_driver_id" in data:
        driver_id = data["assigned_driver_id"] or None
        if driver_id and not db.session.get(Driver, driver_id):
            return jsonify(error="assigned_driver_id does not exist"), 400
        vehicle.assigned_driver_id = driver_id

    for field in ("vin", "model", "manufacturer"):
        if field in data:
            setattr(vehicle, field, data[field] or None)

    try:
        for field in ("insurance_expiry", "fitness_expiry", "pollution_expiry"):
            if field in data:
                setattr(vehicle, field, _parse_date(data[field], field))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    db.session.commit()
    return jsonify(vehicle.to_dict())


@fleet_bp.route("/vehicles/<int:vehicle_id>", methods=["DELETE"])
@role_required(*WRITE_ROLES)
def delete_vehicle(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404

    db.session.delete(vehicle)
    db.session.commit()
    return "", 204
