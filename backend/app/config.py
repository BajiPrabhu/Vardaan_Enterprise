import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me-before-any-real-deploy")
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY", "dev-jwt-secret-change-me-before-any-real-deploy"
    )
    # Tune per real security requirements later; refresh tokens are the
    # natural next hardening step once this needs to survive a full shift
    # without asking someone to log back in.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    
    SQLALCHEMY_DATABASE_URI = os.environ.get(
    "DATABASE_URL", "mysql+pymysql://user:password@localhost:3306/vardaan"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {
    "connect_args": {
        "ssl_verify_cert": False
    }
}

SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Comma-separated in .env, e.g. CORS_ORIGINS=https://fleet.example.com
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    MQTT_BROKER_HOST = os.environ.get("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT = int(os.environ.get("MQTT_BROKER_PORT", 1883))
    MQTT_ENABLED = os.environ.get("MQTT_ENABLED", "true").lower() != "false"
