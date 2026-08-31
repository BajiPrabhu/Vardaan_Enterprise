from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def role_required(*roles):
    """Restrict an endpoint to specific roles.

    Usage:
        @app.route("/api/admin/users")
        @role_required("owner", "administrator")
        def list_users():
            ...
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify(error="Forbidden: insufficient role"), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
