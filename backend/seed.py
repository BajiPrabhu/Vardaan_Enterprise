"""Creates the 9 roles from the spec and one sample user per role, so
there's something to actually log in with. Dev use only.

    python seed.py
"""

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Driver, Role, User

ROLES = [
    ("owner", "Full access across the platform"),
    ("administrator", "Manages users, roles, and system settings"),
    ("fleet_manager", "Manages vehicles, drivers, and trips"),
    ("supervisor", "Oversees day-to-day fleet operations"),
    ("security_officer", "Monitors dash cam feeds, access control, and incidents"),
    ("maintenance_engineer", "Manages vehicle and device maintenance"),
    ("operator", "Runs live monitoring and responds to alerts"),
    ("driver", "Drives an assigned vehicle"),
    ("viewer", "Read-only access"),
]

# Dev only — every seeded account shares this password. Change it, and
# switch to per-user random passwords, before this touches real data.
DEV_PASSWORD = "vardaan-dev-2026"


def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        for name, description in ROLES:
            if not Role.query.filter_by(name=name).first():
                db.session.add(Role(name=name, description=description))
        db.session.commit()

        for name, _ in ROLES:
            if User.query.filter_by(username=name).first():
                continue

            role = Role.query.filter_by(name=name).first()
            user = User(
                username=name,
                email=f"{name}@vardaan.local",
                password_hash=generate_password_hash(DEV_PASSWORD),
                role=role,
            )
            db.session.add(user)
            db.session.flush()  # get user.id before optionally attaching a Driver

            if name == "driver":
                db.session.add(
                    Driver(
                        user=user,
                        full_name="Sample Driver",
                        license_number="DL-0001",
                    )
                )

        db.session.commit()

        print(f"Roles: {Role.query.count()}, users: {User.query.count()}")
        print(f"Log in as any username above (e.g. 'fleet_manager') — password: {DEV_PASSWORD}")


if __name__ == "__main__":
    seed()
