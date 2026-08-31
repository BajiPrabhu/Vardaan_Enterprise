from datetime import datetime

from app.extensions import db


class Driver(db.Model):
    __tablename__ = "drivers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), unique=True, nullable=True
    )
    user = db.relationship("User", back_populates="driver_profile")

    full_name = db.Column(db.String(120), nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)
    license_expiry = db.Column(db.Date, nullable=True)

    health_score = db.Column(db.Integer, nullable=True)
    safety_score = db.Column(db.Integer, nullable=True)

    emergency_contact_name = db.Column(db.String(120), nullable=True)
    emergency_contact_phone = db.Column(db.String(20), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    vehicles = db.relationship("Vehicle", back_populates="assigned_driver")

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "license_number": self.license_number,
            "license_expiry": self.license_expiry.isoformat()
            if self.license_expiry
            else None,
            "health_score": self.health_score,
            "safety_score": self.safety_score,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone,
            "linked_user": (
                {"id": self.user.id, "username": self.user.username}
                if self.user_id
                else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Driver {self.full_name}>"
