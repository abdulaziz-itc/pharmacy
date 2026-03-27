import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from app.db.base_class import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DIRECTOR = "director"
    DEPUTY_DIRECTOR = "deputy_director"
    HRD = "hrd"
    HEAD_OF_ORDERS = "head_of_orders"
    HEAD_OF_WAREHOUSE = "head_of_warehouse"
    WHOLESALE_MANAGER = "wholesale_manager"
    PRODUCT_MANAGER = "product_manager"
    FIELD_FORCE_MANAGER = "field_force_manager"
    REGIONAL_MANAGER = "regional_manager"
    MED_REP = "med_rep"

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean(), default=True)
    role = Column(String, default=UserRole.MED_REP)
    
    # Hierarchical relationship: manager_id points to the user's manager
    manager_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationship to access subordinates
    subordinates = relationship("User", backref="manager", remote_side=[id])

class UserLoginHistory(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    login_at = Column(DateTime, default=datetime.datetime.utcnow)
    ip_address = Column(String, nullable=True)
    location = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    user = relationship("User", backref="login_history")
