from datetime import datetime

from app.extensions import db


class Device(db.Model):
    __tablename__ = "devices"

    id = db.Column(db.Integer, primary_key=True)
    # raspberry_pi, dash_cam, gps_module, rfid_reader, alcohol_sensor,
    # pulse_sensor, temperature_sensor, humidity_sensor, relay_module, ...
    device_type = db.Column(db.String(50), nullable=False)

    hardware_model = db.Column(db.String(80), nullable=True)
    firmware_version = db.Column(db.String(30), nullable=True)

    status = db.Column(db.String(30), default="offline")
    ip_address = db.Column(db.String(45), nullable=True)
    last_heartbeat = db.Column(db.DateTime, nullable=True)

    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=True)
    vehicle = db.relationship("Vehicle", back_populates="devices")

    # back_populates, not a one-sided relationship — without this,
    # SQLAlchemy has no way to know an Alert references this Device before
    # a delete, and the delete fails on the raw foreign key constraint
    # instead of cleanly detaching, the way Vehicle's relationships do.
    alerts = db.relationship("Alert", back_populates="device")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "device_type": self.device_type,
            "hardware_model": self.hardware_model,
            "firmware_version": self.firmware_version,
            "status": self.status,
            "ip_address": self.ip_address,
            "last_heartbeat": self.last_heartbeat.isoformat()
            if self.last_heartbeat
            else None,
            "vehicle": (
                {
                    "id": self.vehicle.id,
                    "registration_number": self.vehicle.registration_number,
                }
                if self.vehicle_id
                else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Device {self.device_type}:{self.id}>"
