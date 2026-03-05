from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base


class AuditLog(Base):
    """Tracks every significant user action for the Director audit view."""
    id = Column(Integer, primary_key=True, index=True)

    # Who performed the action
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    username = Column(String, nullable=True)        # snapshot in case user deleted
    full_name = Column(String, nullable=True)

    # What was done
    action = Column(String, nullable=False)         # CREATE, UPDATE, DELETE, BONUS_PAYMENT, etc.
    entity_type = Column(String, nullable=True)     # Doctor, Plan, BonusPayment, etc.
    entity_id = Column(Integer, nullable=True)

    # Description / context
    description = Column(Text, nullable=True)

    # Network info (MAC not accessible from HTTP; we log IP)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship (optional, may be null if user was removed)
    user = relationship("User", foreign_keys=[user_id])
