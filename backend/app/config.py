import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "dev-secret-change-me-before-any-real-deploy",
    )

    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY",
        "dev-jwt-secret-change-me-before-any-real-deploy",
    )

    # Access tokens currently remain valid for 12 hours.
    # Refresh-token hardening can be introduced later when needed.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://user:password@localhost:3306/vardaan",
    )

    # Aiven MySQL requires an SSL connection.
    # Certificate verification can be hardened later with Aiven's CA certificate.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {
            "ssl_verify_cert": False,
        }
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173",
    ).split(",")

    MQTT_BROKER_HOST = os.environ.get(
        "MQTT_BROKER_HOST",
        "localhost",
    )

    MQTT_BROKER_PORT = int(
        os.environ.get(
            "MQTT_BROKER_PORT",
            1883,
        )
    )

    MQTT_ENABLED = (
        os.environ.get(
            "MQTT_ENABLED",
            "true",
        ).lower()
        != "false"
    )