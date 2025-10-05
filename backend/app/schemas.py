from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum

# Enums
class BloodTypeEnum(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"

class BloodComponentEnum(str, Enum):
    WHOLE_BLOOD = "Whole Blood"
    PACKED_CELLS = "Packed Cells"
    FRESH_FROZEN_PLASMA = "Fresh Frozen Plasma"
    PLATELETS = "Platelets"
    CRYOPRECIPITATE = "Cryoprecipitate"

class OrderStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class PriorityEnum(str, Enum):
    NORMAL = "normal"
    CRITICAL = "critical"
    VERY_CRITICAL = "very_critical"

class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    HOSPITAL_STAFF = "hospital_staff"
    BLOOD_BANK_STAFF = "blood_bank_staff"
    VIEWER = "viewer"

# Base schemas
class HospitalBase(BaseModel):
    name: str
    hospital_code: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    region: Optional[str] = None
    license_number: Optional[str] = None

class HospitalCreate(HospitalBase):
    pass

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    region: Optional[str] = None
    license_number: Optional[str] = None
    is_active: Optional[bool] = None

class Hospital(HospitalBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.HOSPITAL_STAFF
    position: Optional[str] = None

class UserCreate(UserBase):
    password: str
    hospital_code: str  # For linking to hospital during registration

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    id: int
    hospital_id: Optional[int] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None

class User(UserInDB):
    hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

# Blood Stock schemas
class BloodStockBase(BaseModel):
    blood_type: BloodTypeEnum
    component: BloodComponentEnum
    units_available: int
    expiry_date: datetime
    donation_date: datetime
    batch_number: str
    source_location: Optional[str] = None

class BloodStockCreate(BloodStockBase):
    pass

class BloodStockUpdate(BaseModel):
    units_available: Optional[int] = None
    is_expired: Optional[bool] = None
    is_reserved: Optional[bool] = None

class BloodStock(BloodStockBase):
    id: int
    hospital_id: Optional[int] = None
    is_expired: bool
    is_reserved: bool
    reserved_for_order_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Blood Order schemas
class BloodOrderBase(BaseModel):
    blood_type: BloodTypeEnum
    component: BloodComponentEnum
    units_requested: int
    priority: PriorityEnum = PriorityEnum.NORMAL
    reason: Optional[str] = None
    patient_details: Optional[str] = None
    urgency_notes: Optional[str] = None
    expected_use_date: Optional[datetime] = None

class BloodOrderCreate(BloodOrderBase):
    pass

class BloodOrderUpdate(BaseModel):
    units_requested: Optional[int] = None
    priority: Optional[PriorityEnum] = None
    reason: Optional[str] = None
    patient_details: Optional[str] = None
    urgency_notes: Optional[str] = None
    expected_use_date: Optional[datetime] = None
    status: Optional[OrderStatusEnum] = None

class BloodOrder(BloodOrderBase):
    id: int
    hospital_id: int
    created_by_user_id: int
    units_fulfilled: int
    status: OrderStatusEnum
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True

# Emergency Request schemas
class EmergencyRequestBase(BaseModel):
    blood_type: BloodTypeEnum
    component: BloodComponentEnum
    units_needed: int
    patient_condition: str
    contact_person: str
    contact_phone: str
    response_deadline: datetime

class EmergencyRequestCreate(EmergencyRequestBase):
    pass

class EmergencyRequest(EmergencyRequestBase):
    id: int
    hospital_id: int
    is_active: bool
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True

# Emergency Response schemas
class EmergencyResponseBase(BaseModel):
    units_offered: int
    response_message: Optional[str] = None
    contact_person: str
    contact_phone: str
    estimated_availability: Optional[datetime] = None

class EmergencyResponseCreate(EmergencyResponseBase):
    emergency_request_id: int

class EmergencyResponse(EmergencyResponseBase):
    id: int
    emergency_request_id: int
    responding_hospital_id: int
    is_accepted: bool
    created_at: datetime
    responding_hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True

# Notification schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str = "INFO"
    action_url: Optional[str] = None

class NotificationCreate(NotificationBase):
    recipient_hospital_id: Optional[int] = None
    recipient_user_id: Optional[int] = None

class Notification(NotificationBase):
    id: int
    recipient_hospital_id: Optional[int] = None
    recipient_user_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Dashboard and Statistics schemas
class BloodStockSummary(BaseModel):
    blood_type: BloodTypeEnum
    component: BloodComponentEnum
    total_units: int
    near_expiry_units: int  # Expiring in next 7 days
    critical_level: bool    # Below minimum threshold

class HospitalDashboard(BaseModel):
    hospital: Hospital
    pending_orders: int
    critical_orders: int
    low_stock_alerts: List[BloodStockSummary]
    recent_notifications: List[Notification]

class SystemStats(BaseModel):
    total_hospitals: int
    total_blood_units: int
    pending_orders: int
    critical_requests: int
    units_expiring_soon: int
    blood_type_distribution: dict

# Search and Filter schemas
class BloodStockFilter(BaseModel):
    blood_type: Optional[BloodTypeEnum] = None
    component: Optional[BloodComponentEnum] = None
    hospital_id: Optional[int] = None
    exclude_expired: bool = True
    exclude_reserved: bool = False
    min_units: Optional[int] = None

class OrderFilter(BaseModel):
    hospital_id: Optional[int] = None
    status: Optional[OrderStatusEnum] = None
    priority: Optional[PriorityEnum] = None
    blood_type: Optional[BloodTypeEnum] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class BloodStockSearchResult(BaseModel):
    """Blood stock search result with hospital location information"""
    stock_id: int
    blood_type: str
    component: str
    units_available: int
    expiry_date: datetime
    days_to_expiry: int
    donation_date: datetime
    batch_number: str
    source_location: Optional[str] = None
    availability_status: str  # Available, Expires Soon, Expired
    
    # Hospital information
    hospital_id: int
    hospital_name: str
    hospital_code: str
    hospital_address: Optional[str] = None
    hospital_district: Optional[str] = None
    hospital_region: Optional[str] = None
    hospital_phone: Optional[str] = None
    hospital_email: str
    
    # Distance and location context
    estimated_distance_km: Optional[int] = None
    is_same_hospital: bool = False

    class Config:
        orm_mode = True

# Donation Schedule schemas
class DonationScheduleBase(BaseModel):
    blood_stock_id: int
    units_offered: int
    reason: Optional[str] = None
    notes: Optional[str] = None

class DonationScheduleCreate(BaseModel):
    blood_stock_ids: List[int]  # Can schedule multiple stocks at once
    reason: Optional[str] = None
    notes: Optional[str] = None

class DonationSchedule(DonationScheduleBase):
    id: int
    donating_hospital_id: int
    is_active: bool
    is_critical_expiry: bool
    created_by_user_id: int
    created_at: datetime
    expires_at: Optional[datetime] = None
    accepted_by_hospital_id: Optional[int] = None
    accepted_at: Optional[datetime] = None
    status: str
    
    # Include related data
    blood_stock: Optional[BloodStock] = None
    donating_hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True

class DonationScheduleWithDetails(BaseModel):
    """Donation schedule with full details for display"""
    id: int
    units_offered: int
    reason: Optional[str] = None
    notes: Optional[str] = None
    is_critical_expiry: bool
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    # Blood stock details
    blood_type: str
    component: str
    expiry_date: datetime
    days_to_expiry: int
    batch_number: str
    
    # Donating hospital details
    donating_hospital_id: int
    donating_hospital_name: str
    donating_hospital_code: str
    donating_hospital_region: Optional[str] = None
    donating_hospital_district: Optional[str] = None
    donating_hospital_phone: Optional[str] = None
    donating_hospital_email: str

# Blood Request schemas
class BloodRequestBase(BaseModel):
    blood_type: BloodTypeEnum
    component: BloodComponentEnum
    units_requested: int
    priority: PriorityEnum = PriorityEnum.NORMAL
    reason: Optional[str] = None
    patient_details: Optional[str] = None
    urgency_notes: Optional[str] = None
    expected_use_date: Optional[datetime] = None

class BloodRequestCreate(BloodRequestBase):
    target_hospital_id: Optional[int] = None  # None means broadcast to all

class BloodRequestUpdate(BaseModel):
    status: Optional[OrderStatusEnum] = None
    rejection_reason: Optional[str] = None

class BloodRequest(BloodRequestBase):
    id: int
    requesting_hospital_id: int
    target_hospital_id: Optional[int] = None
    created_by_user_id: int
    status: OrderStatusEnum
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    requesting_hospital: Optional[Hospital] = None
    target_hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True

# Blood Request Response schemas
class BloodRequestResponseCreate(BaseModel):
    units_offered: int
    response_message: Optional[str] = None
    estimated_availability: Optional[datetime] = None

class BloodRequestResponse(BloodRequestResponseCreate):
    id: int
    blood_request_id: int
    responding_hospital_id: int
    responding_user_id: int
    status: str
    accepted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    responding_hospital: Optional[Hospital] = None

    class Config:
        orm_mode = True
