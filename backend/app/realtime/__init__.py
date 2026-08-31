from flask_jwt_extended import decode_token

from app.extensions import socketio


def register_socket_handlers():
    @socketio.on("connect")
    def handle_connect(auth):
        """Reject the connection outright without a valid access token —
        live device data shouldn't be reachable over an unauthenticated
        channel just because the REST API is protected."""
        token = (auth or {}).get("token")
        if not token:
            return False
        try:
            decode_token(token)
        except Exception:
            return False

    @socketio.on_error_default
    def handle_error(e):
        # Don't let a bad event handler take the whole connection down
        # silently — at least get it into the server log.
        print(f"SocketIO error: {e}")
