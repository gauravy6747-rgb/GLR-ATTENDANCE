from sqlalchemy import Column, String, Boolean, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.core.database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    employee_id = Column(
        String,
        unique=True,
        nullable=False
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    phone = Column(String)

    role = Column(
        String,
        default="employee"
    )

    face_image_url = Column(
        String,
        nullable=True
    )

    face_enrolled = Column(
        Boolean,
        default=False
    )

    is_active = Column(
        Boolean,
        default=True
    )

    base_salary = Column(
        Float,
        default=0.0,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=True,
        onupdate=datetime.utcnow
    )