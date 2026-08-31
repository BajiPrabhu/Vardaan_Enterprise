from datetime import datetime

from app.extensions import db


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(30), unique=True, nullable=False)
    vin = db.Column(db.String(50), unique=True, nullable=True)
    model = db.Column(db.String(80), nullable=True)
    manufacturer = db.Column(db.String(80), nullable=True)

    insurance_expiry = db.Column(db.Date, nullable=True)
    fitness_expiry = db.Column(db.Date, nullable=True)
    pollution_expiry = db.Column(db.Date, nullable=True)

    # active, inactive, in_trip, maintenance, out_of_service
    status = db.Column(db.String(30), default="inactive")

    assigned_driver_id = db.Column(
        db.Integer, db.ForeignKey("drivers.id"), nullable=True
    )
    assigned_driver = db.relationship("Driver", back_populates="vehicles")

    devices = db.relationship("Device", back_populates="vehicle")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "registration_number": self.registration_number,
            "vin": self.vin,
            "model": self.model,
            "manufacturer": self.manufacturer,
            "insurance_expiry": self.insurance_expiry.isoformat()
            if self.insurance_expiry
            else None,
            "fitness_expiry": self.fitness_expiry.isoformat()
            if self.fitness_expiry
            else None,
            "pollution_expiry": self.pollution_expiry.isoformat()
            if self.pollution_expiry
            else None,
            "status": self.status,
            "assigned_driver": (
                {
                    "id": self.assigned_driver.id,
                    "full_name": self.assigned_driver.full_name,
                }
                if self.assigned_driver_id
                else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Vehicle {self.registration_number}>"
