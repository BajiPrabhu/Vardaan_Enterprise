from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # socketio.run(), not app.run() — the dev server needs to know about
    # SocketIO to handle the WebSocket upgrade, not just plain HTTP.
    socketio.run(app, debug=True, use_reloader=False)
