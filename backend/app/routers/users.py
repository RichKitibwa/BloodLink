from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter()

@router.post("/register", response_model=schemas.User)
async def register_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user with hospital code validation"""
    try:
        user = auth.create_user(db, user_data)
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/verify-hospital-code")
async def verify_hospital_code(
    hospital_code: str,
    db: Session = Depends(get_db)
):
    """Verify if hospital code exists and is active"""
    hospital = auth.verify_hospital_code(db, hospital_code)
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid hospital code"
        )
    
    return {
        "valid": True,
        "hospital_name": hospital.name,
        "hospital_type": "Government" if hospital.hospital_code.startswith("G") else 
                        "Private" if hospital.hospital_code.startswith("P") else "Non-profit"
    }

@router.get("/me", response_model=schemas.User)
async def get_current_user_profile(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get current user profile"""
    return current_user

@router.put("/me", response_model=schemas.User)
async def update_current_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    for field, value in user_update.dict(exclude_unset=True).items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/dashboard", response_model=schemas.HospitalDashboard)
async def get_user_dashboard(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user dashboard data"""
    # Get pending orders count
    pending_orders = db.query(models.BloodOrder).filter(
        models.BloodOrder.hospital_id == current_user.hospital_id,
        models.BloodOrder.status == models.OrderStatus.PENDING
    ).count()
    
    # Get critical orders count
    critical_orders = db.query(models.BloodOrder).filter(
        models.BloodOrder.hospital_id == current_user.hospital_id,
        models.BloodOrder.priority == models.Priority.CRITICAL
    ).count()
    
    # Get recent notifications
    recent_notifications = db.query(models.Notification).filter(
        models.Notification.recipient_user_id == current_user.id,
        models.Notification.is_read == False
    ).limit(5).all()
    
    # Get low stock alerts
    low_stock_alerts = []
    
    return {
        "hospital": current_user.hospital,
        "pending_orders": pending_orders,
        "critical_orders": critical_orders,
        "low_stock_alerts": low_stock_alerts,
        "recent_notifications": recent_notifications
    }

@router.get("/hospitals", response_model=List[schemas.Hospital])
async def list_hospitals(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF])),
    db: Session = Depends(get_db)
):
    """List all hospitals (admin only)"""
    hospitals = db.query(models.Hospital).offset(skip).limit(limit).all()
    return hospitals

@router.post("/hospitals", response_model=schemas.Hospital)
async def create_hospital(
    hospital_data: schemas.HospitalCreate,
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new hospital (admin only)"""
    # Check if hospital code already exists
    existing = db.query(models.Hospital).filter(
        models.Hospital.hospital_code == hospital_data.hospital_code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital code already exists"
        )
    
    hospital = models.Hospital(**hospital_data.dict())
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital
