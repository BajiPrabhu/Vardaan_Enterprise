from datetime import datetime

from app.extensions import db


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)

    device_id = db.Column(db.Integer, db.ForeignKey("devices.id"), nullable=True)
    device = db.relationship("Device", back_populates="alerts")
    # Snapshotted at creation, not read live off `device` — an audit
    # record needs to still say what kind of device this was about even
    # after that device is deleted and `device_id` goes to NULL.
    device_type = db.Column(db.String(50), nullable=True)

    # alcohol_detected, high_pulse, device_critical, device_offline —
    # only types this system can actually detect from real telemetry.
    # Not inventing geofence/tamper/access alerts with no sensor behind
    # them yet.
    alert_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # critical, warning
    message = db.Column(db.String(255), nullable=False)
    reading = db.Column(db.JSON, nullable=True)

    acknowledged = db.Column(db.Boolean, default=False, nullable=False)
    acknowledged_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    acknowledged_by = db.relationship("User")
    acknowledged_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "device_type": self.device_type,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "message": self.message,
            "reading": self.reading,
            "acknowledged": self.acknowledged,
            "acknowledged_by": (
                {
                    "id": self.acknowledged_by.id,
                    "username": self.acknowledged_by.username,
                }
                if self.acknowledged_by_id
                else None
            ),
            "acknowledged_at": self.acknowledged_at.isoformat()
            if self.acknowledged_at
            else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Alert {self.alert_type}:{self.id}>"
