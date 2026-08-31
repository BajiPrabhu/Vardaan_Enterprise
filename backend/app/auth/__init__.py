from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify(error="Username and password are required"), 400

    user = User.query.filter_by(username=username).first()

    # Same generic error either way — don't reveal whether the username
    # exists, only whether the credentials as a pair were valid.
    if not user or not user.is_active or not check_password_hash(
        user.password_hash, password
    ):
        return jsonify(error="Invalid username or password"), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role.name, "username": user.username},
    )

    user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify(access_token=token, user=user.to_dict())


@auth_bp.route("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify(error="User not found"), 404
    return jsonify(user=user.to_dict())
