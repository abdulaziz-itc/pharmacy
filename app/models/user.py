from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.db.base_class import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DIRECTOR = "director"
    DEPUTY_DIRECTOR = "deputy_director"
    HEAD_OF_ORDERS = "head_of_orders"
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
