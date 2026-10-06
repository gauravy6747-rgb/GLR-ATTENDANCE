from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.core.database import Base


class MisPunchRequest(Base):
    __tablename__ = "mispunch_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    
    # 'checkout_only' | 'checkin_only' | 'both'
    request_type = Column(String(20), nullable=False)
    
    requested_checkin_time = Column(DateTime, nullable=True)
    requested_checkout_time = Column(DateTime, nullable=True)
    
    reason = Column(String(280), nullable=False)
    status = Column(String(20), default="pending")  # 'pending' | 'approved' | 'rejected'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    action_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action_at = Column(DateTime, nullable=True)
    admin_notes = Column(String(280), nullable=True)
