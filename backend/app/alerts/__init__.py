from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.auth.decorators import role_required
from app.extensions import db
from app.models import Alert

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api")

# Read is open to any authenticated role, same as Fleet/Devices/Monitoring
# — a safety alert isn't sensitive the way a driver's health score is,
# and everyone from a driver to an owner has a reason to see one. Only
# acknowledging is restricted, to the roles actually positioned to act on
# one — "operator" is named in the spec specifically for this.
ACK_ROLES = ("owner", "administrator", "supervisor", "operator")

# No DELETE on this resource, deliberately — an alert is a safety and
# compliance record. Acknowledging it is the only state change allowed;
# making one disappear entirely isn't a feature this module offers.


@alerts_bp.route("/alerts", methods=["GET"])
@jwt_required()
def list_alerts():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    acknowledged = request.args.get("acknowledged")

    query = Alert.query
    if acknowledged is not None:
        query = query.filter_by(acknowledged=acknowledged.lower() == "true")

    pagination = query.order_by(Alert.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        items=[a.to_dict() for a in pagination.items],
        total=pagination.total,
        page=pagination.page,
        per_page=pagination.per_page,
        unacknowledged_total=Alert.query.filter_by(acknowledged=False).count(),
    )


@alerts_bp.route("/alerts/<int:alert_id>/acknowledge", methods=["POST"])
@role_required(*ACK_ROLES)
def acknowledge_alert(alert_id):
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify(error="Alert not found"), 404

    if alert.acknowledged:
        return jsonify(error="Alert is already acknowledged"), 409

    alert.acknowledged = True
    alert.acknowledged_by_id = int(get_jwt_identity())
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify(alert.to_dict())
