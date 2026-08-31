from flask import Flask

from app.config import Config
from app.extensions import db, migrate, jwt, cors, socketio


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    socketio.init_app(app, cors_allowed_origins=app.config["CORS_ORIGINS"])

    from app import models  # noqa: F401  (registers models with SQLAlchemy)
    from app.api import health_bp
    from app.auth import auth_bp
    from app.fleet import fleet_bp
    from app.devices import devices_bp
    from app.drivers import drivers_bp
    from app.alerts import alerts_bp
    from app.realtime import register_socket_handlers
    from app.realtime.mqtt_client import start_mqtt_client

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(fleet_bp)
    app.register_blueprint(devices_bp)
    app.register_blueprint(drivers_bp)
    app.register_blueprint(alerts_bp)

    register_socket_handlers()

    if app.config["MQTT_ENABLED"]:
        app.mqtt_client = start_mqtt_client(app)

    return app
