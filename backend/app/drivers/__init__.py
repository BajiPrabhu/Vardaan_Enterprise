from datetime import date

from flask import Blueprint, jsonify, request

from app.auth.decorators import role_required
from app.extensions import db
from app.models import Driver

drivers_bp = Blueprint("drivers", __name__, url_prefix="/api")

# Health score, safety score, and emergency contacts are more sensitive
# than a vehicle or device record, so read access here is deliberately
# narrower than Fleet or Devices — the roles that plausibly need to
# review driver records day to day, not every authenticated role.
READ_ROLES = ("owner", "administrator", "fleet_manager", "supervisor")
WRITE_ROLES = ("owner", "administrator", "fleet_manager")

# Linking a Driver to a User login (Driver.user_id) is deliberately not
# exposed here — this module manages the personnel record (name, license,
# scores, emergency contact). Login-linking belongs with real user
# management, which doesn't exist yet (that's Administration).


def _parse_date(value, field):
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be an ISO date (YYYY-MM-DD)")


def _parse_score(value, field):
    if value in (None, ""):
        return None
    try:
        score = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a whole number")
    if not 0 <= score <= 100:
        raise ValueError(f"{field} must be between 0 and 100")
    return score


@drivers_bp.route("/drivers", methods=["GET"])
@role_required(*READ_ROLES)
def list_drivers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)

    pagination = Driver.query.order_by(Driver.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        items=[d.to_dict() for d in pagination.items],
        total=pagination.total,
        page=pagination.page,
        per_page=pagination.per_page,
    )


@drivers_bp.route("/drivers/<int:driver_id>", methods=["GET"])
@role_required(*READ_ROLES)
def get_driver(driver_id):
    driver = db.session.get(Driver, driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    return jsonify(driver.to_dict())


@drivers_bp.route("/drivers", methods=["POST"])
@role_required(*WRITE_ROLES)
def create_driver():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    license_number = (data.get("license_number") or "").strip()

    if not full_name:
        return jsonify(error="full_name is required"), 400
    if not license_number:
        return jsonify(error="license_number is required"), 400

    if Driver.query.filter_by(license_number=license_number).first():
        return jsonify(
            error="A driver with that license number already exists"
        ), 409

    try:
        driver = Driver(
            full_name=full_name,
            license_number=license_number,
            license_expiry=_parse_date(data.get("license_expiry"), "license_expiry"),
            health_score=_parse_score(data.get("health_score"), "health_score"),
            safety_score=_parse_score(data.get("safety_score"), "safety_score"),
            emergency_contact_name=data.get("emergency_contact_name") or None,
            emergency_contact_phone=data.get("emergency_contact_phone") or None,
        )
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    db.session.add(driver)
    db.session.commit()

    return jsonify(driver.to_dict()), 201


@drivers_bp.route("/drivers/<int:driver_id>", methods=["PATCH"])
@role_required(*WRITE_ROLES)
def update_driver(driver_id):
    driver = db.session.get(Driver, driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404

    data = request.get_json(silent=True) or {}

    if "full_name" in data:
        new_name = (data["full_name"] or "").strip()
        if not new_name:
            return jsonify(error="full_name cannot be empty"), 400
        driver.full_name = new_name

    if "license_number" in data:
        new_license = (data["license_number"] or "").strip()
        if not new_license:
            return jsonify(error="license_number cannot be empty"), 400
        clash = Driver.query.filter_by(license_number=new_license).first()
        if clash and clash.id != driver.id:
            return jsonify(
                error="A driver with that license number already exists"
            ), 409
        driver.license_number = new_license

    for field in ("emergency_contact_name", "emergency_contact_phone"):
        if field in data:
            setattr(driver, field, data[field] or None)

    try:
        if "license_expiry" in data:
            driver.license_expiry = _parse_date(
                data["license_expiry"], "license_expiry"
            )
        if "health_score" in data:
            driver.health_score = _parse_score(data["health_score"], "health_score")
        if "safety_score" in data:
            driver.safety_score = _parse_score(data["safety_score"], "safety_score")
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    db.session.commit()
    return jsonify(driver.to_dict())


@drivers_bp.route("/drivers/<int:driver_id>", methods=["DELETE"])
@role_required(*WRITE_ROLES)
def delete_driver(driver_id):
    driver = db.session.get(Driver, driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404

    db.session.delete(driver)
    db.session.commit()
    return "", 204
