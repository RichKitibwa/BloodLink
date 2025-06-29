from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from .database import Base

# Enums for better data integrity
class BloodType(str, enum.Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"

class BloodComponent(str, enum.Enum):
    WHOLE_BLOOD = "Whole Blood"
    PACKED_CELLS = "Packed Cells"
    FRESH_FROZEN_PLASMA = "Fresh Frozen Plasma"
    PLATELETS = "Platelets"
    CRYOPRECIPITATE = "Cryoprecipitate"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class Priority(str, enum.Enum):
    NORMAL = "normal"
    CRITICAL = "critical"
    VERY_CRITICAL = "very_critical"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    HOSPITAL_STAFF = "hospital_staff"
    BLOOD_BANK_STAFF = "blood_bank_staff"
    VIEWER = "viewer"

class Hospital(Base):
    __tablename__ = "hospitals"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    hospital_code = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String)
    address = Column(Text)
    district = Column(String)
    region = Column(String)
    license_number = Column(String, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="hospital")
    blood_orders = relationship("BloodOrder", back_populates="hospital")
    emergency_requests = relationship("EmergencyRequest", back_populates="hospital")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone = Column(String)
    role = Column(Enum(UserRole), default=UserRole.HOSPITAL_STAFF)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    position = Column(String)  # Position in facility
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    last_login = Column(DateTime)
    
    # Relationships
    hospital = relationship("Hospital", back_populates="users")
    created_orders = relationship("BloodOrder", back_populates="created_by_user")

class BloodStock(Base):
    __tablename__ = "blood_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    blood_type = Column(Enum(BloodType), nullable=False, index=True)
    component = Column(Enum(BloodComponent), nullable=False, index=True)
    units_available = Column(Integer, default=0)
    expiry_date = Column(DateTime, nullable=False, index=True)
    donation_date = Column(DateTime, nullable=False)
    batch_number = Column(String, unique=True, nullable=False)
    source_location = Column(String)  # Blood bank or collection center
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)  # If allocated to specific hospital
    is_expired = Column(Boolean, default=False)
    is_reserved = Column(Boolean, default=False)
    reserved_for_order_id = Column(Integer, ForeignKey("blood_orders.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    hospital = relationship("Hospital")
    reserved_order = relationship("BloodOrder")

class BloodOrder(Base):
    __tablename__ = "blood_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    blood_type = Column(Enum(BloodType), nullable=False, index=True)
    component = Column(Enum(BloodComponent), nullable=False)
    units_requested = Column(Integer, nullable=False)
    units_fulfilled = Column(Integer, default=0)
    priority = Column(Enum(Priority), default=Priority.NORMAL, index=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, index=True)
    reason = Column(Text)  # Reason for blood request
    patient_details = Column(Text)  # Anonymous patient info
    urgency_notes = Column(Text)
    expected_use_date = Column(DateTime)
    approved_by = Column(String)  # Blood bank staff who approved
    approved_at = Column(DateTime)
    fulfilled_at = Column(DateTime)
    rejection_reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    hospital = relationship("Hospital", back_populates="blood_orders")
    created_by_user = relationship("User", back_populates="created_orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("blood_orders.id"), nullable=False)
    blood_stock_id = Column(Integer, ForeignKey("blood_stock.id"), nullable=False)
    units_allocated = Column(Integer, nullable=False)
    allocated_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    order = relationship("BloodOrder", back_populates="order_items")
    blood_stock = relationship("BloodStock")

class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    blood_type = Column(Enum(BloodType), nullable=False, index=True)
    component = Column(Enum(BloodComponent), nullable=False)
    units_needed = Column(Integer, nullable=False)
    patient_condition = Column(Text, nullable=False)
    contact_person = Column(String, nullable=False)
    contact_phone = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    response_deadline = Column(DateTime, nullable=False)
    status = Column(String, default="OPEN")  # OPEN, RESPONDED, CLOSED
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime)
    
    # Relationships
    hospital = relationship("Hospital", back_populates="emergency_requests")
    responses = relationship("EmergencyResponse", back_populates="emergency_request")

class EmergencyResponse(Base):
    __tablename__ = "emergency_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    emergency_request_id = Column(Integer, ForeignKey("emergency_requests.id"), nullable=False)
    responding_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    units_offered = Column(Integer, nullable=False)
    response_message = Column(Text)
    contact_person = Column(String, nullable=False)
    contact_phone = Column(String, nullable=False)
    estimated_availability = Column(DateTime)
    is_accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    emergency_request = relationship("EmergencyRequest", back_populates="responses")
    responding_hospital = relationship("Hospital")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="INFO")  # INFO, WARNING, CRITICAL, SUCCESS
    is_read = Column(Boolean, default=False)
    action_url = Column(String)  # URL for related action
    created_at = Column(DateTime, server_default=func.now())
    read_at = Column(DateTime)
    
    # Relationships
    recipient_hospital = relationship("Hospital")
    recipient_user = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)  # hospital, order, blood_stock, etc.
    entity_id = Column(Integer)
    old_values = Column(Text)  # JSON string of old values
    new_values = Column(Text)  # JSON string of new values
    ip_address = Column(String)
    user_agent = Column(String)
    timestamp = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User")
