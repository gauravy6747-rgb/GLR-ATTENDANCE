from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.core.database import Base


class MonthlyNote(Base):
    __tablename__ = "monthly_notes"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    year = Column(
        Integer,
        nullable=False
    )

    month = Column(
        Integer,
        nullable=False
    )

    note = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_user_monthly_note"),
    )
