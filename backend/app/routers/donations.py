from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter()

def get_utc_now():
    """Get current UTC datetime that's timezone-aware"""
    return datetime.now(timezone.utc)

def make_timezone_aware(dt):
    """Make a datetime timezone-aware if it isn't already"""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

@router.post("/schedule", status_code=status.HTTP_201_CREATED)
async def schedule_donations(
    donation_data: schemas.DonationScheduleCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule blood units for donation to other hospitals.
    Critical expiry units (expiring within 5 days) are automatically included.
    """
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    created_schedules = []
    critical_expiry_threshold = get_utc_now() + timedelta(days=5)
    
    for stock_id in donation_data.blood_stock_ids:
        # Verify the blood stock exists
        blood_stock = db.query(models.BloodStock).filter(
            models.BloodStock.id == stock_id
        ).first()
        
        if not blood_stock:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Blood stock with ID {stock_id} not found"
            )
        
        # Check if blood stock belongs to user's hospital or is unallocated
        if blood_stock.hospital_id and blood_stock.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Blood stock {stock_id} belongs to another hospital"
            )
        
        # If unallocated, allocate it to the user's hospital
        if not blood_stock.hospital_id:
            blood_stock.hospital_id = current_user.hospital_id
        
        if blood_stock.is_expired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot schedule expired blood (batch: {blood_stock.batch_number})"
            )
        
        if blood_stock.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Blood stock is already reserved (batch: {blood_stock.batch_number})"
            )
        
        # Check if already scheduled
        existing_schedule = db.query(models.DonationSchedule).filter(
            models.DonationSchedule.blood_stock_id == stock_id,
            models.DonationSchedule.is_active == True
        ).first()
        
        if existing_schedule:
            continue  # Skip if already scheduled
        
        # Check if this is critical expiry
        expiry_date = make_timezone_aware(blood_stock.expiry_date)
        is_critical = expiry_date <= critical_expiry_threshold
        
        # Create donation schedule
        schedule = models.DonationSchedule(
            donating_hospital_id=current_user.hospital_id,
            blood_stock_id=stock_id,
            units_offered=blood_stock.units_available,
            reason=donation_data.reason or ("Critical Expiry" if is_critical else "Available for Transfer"),
            notes=donation_data.notes,
            is_critical_expiry=is_critical,
            created_by_user_id=current_user.id,
            expires_at=blood_stock.expiry_date,
            status="AVAILABLE"
        )
        
        db.add(schedule)
        created_schedules.append(schedule)
        
        # Mark blood stock as reserved for donation
        blood_stock.is_reserved = True
    
    db.commit()
    
    # Create notifications for other hospitals
    if created_schedules:
        notification = models.Notification(
            title=f"Blood Units Available for Donation",
            message=f"{current_user.hospital.name} has scheduled {len(created_schedules)} blood unit(s) for donation",
            notification_type="INFO",
            recipient_hospital_id=None  # Broadcast to all hospitals
        )
        db.add(notification)
        db.commit()
    
    return {
        "message": f"Successfully scheduled {len(created_schedules)} blood unit(s) for donation",
        "scheduled_count": len(created_schedules)
    }

@router.get("/available", response_model=List[schemas.DonationScheduleWithDetails])
async def get_available_donations(
    blood_type: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    exclude_own_hospital: bool = Query(True),
    sort_by: str = Query("expiry_date", description="Sort by: expiry_date, created_at, distance"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all available blood donations from other hospitals.
    This is the tab that shows units up for donation.
    """
    # Query for active donation schedules
    query = db.query(
        models.DonationSchedule,
        models.BloodStock,
        models.Hospital
    ).join(
        models.BloodStock,
        models.DonationSchedule.blood_stock_id == models.BloodStock.id
    ).join(
        models.Hospital,
        models.DonationSchedule.donating_hospital_id == models.Hospital.id
    ).filter(
        models.DonationSchedule.is_active == True,
        models.DonationSchedule.status == "AVAILABLE"
    )
    
    # Exclude own hospital's donations
    if exclude_own_hospital and current_user.hospital_id:
        query = query.filter(models.DonationSchedule.donating_hospital_id != current_user.hospital_id)
    
    # Apply filters
    if blood_type:
        query = query.filter(models.BloodStock.blood_type == blood_type)
    
    if component:
        query = query.filter(models.BloodStock.component == component)
    
    if region:
        query = query.filter(models.Hospital.region.ilike(f"%{region}%"))
    
    results = query.all()
    
    # Process results
    donations = []
    user_hospital = current_user.hospital
    
    for schedule, stock, hospital in results:
        expiry_date = make_timezone_aware(stock.expiry_date)
        days_to_expiry = (expiry_date - get_utc_now()).days
        
        # Calculate estimated distance
        distance_km = None
        if user_hospital and hospital:
            if user_hospital.region == hospital.region:
                if user_hospital.district == hospital.district:
                    distance_km = 5
                else:
                    distance_km = 50
            else:
                distance_km = 200
        
        donations.append({
            "id": schedule.id,
            "units_offered": schedule.units_offered,
            "reason": schedule.reason,
            "notes": schedule.notes,
            "is_critical_expiry": schedule.is_critical_expiry,
            "status": schedule.status,
            "created_at": schedule.created_at,
            "expires_at": schedule.expires_at,
            "blood_type": stock.blood_type.value,
            "component": stock.component.value,
            "expiry_date": stock.expiry_date,
            "days_to_expiry": days_to_expiry,
            "batch_number": stock.batch_number,
            "donating_hospital_id": hospital.id,
            "donating_hospital_name": hospital.name,
            "donating_hospital_code": hospital.hospital_code,
            "donating_hospital_region": hospital.region,
            "donating_hospital_district": hospital.district,
            "donating_hospital_phone": hospital.phone,
            "donating_hospital_email": hospital.email,
            "estimated_distance_km": distance_km
        })
    
    # Sort results
    if sort_by == "expiry_date":
        donations.sort(key=lambda x: x["expiry_date"])
    elif sort_by == "created_at":
        donations.sort(key=lambda x: x["created_at"], reverse=True)
    elif sort_by == "distance" and all(d.get("estimated_distance_km") for d in donations):
        donations.sort(key=lambda x: x.get("estimated_distance_km", 999))
    
    return donations

@router.get("/my-schedules", response_model=List[schemas.DonationSchedule])
async def get_my_donation_schedules(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get donation schedules created by the current user's hospital"""
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    schedules = db.query(models.DonationSchedule).filter(
        models.DonationSchedule.donating_hospital_id == current_user.hospital_id
    ).order_by(desc(models.DonationSchedule.created_at)).all()
    
    return schedules

@router.post("/{schedule_id}/accept")
async def accept_donation(
    schedule_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Accept a blood donation from another hospital"""
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    schedule = db.query(models.DonationSchedule).filter(
        models.DonationSchedule.id == schedule_id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation schedule not found"
        )
    
    if not schedule.is_active or schedule.status != "AVAILABLE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This donation is no longer available"
        )
    
    if schedule.donating_hospital_id == current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept your own donation"
        )
    
    # Update schedule
    schedule.status = "ACCEPTED"
    schedule.accepted_by_hospital_id = current_user.hospital_id
    schedule.accepted_at = get_utc_now()
    schedule.is_active = False
    
    # Update blood stock - transfer to accepting hospital
    blood_stock = db.query(models.BloodStock).filter(
        models.BloodStock.id == schedule.blood_stock_id
    ).first()
    
    if blood_stock:
        blood_stock.hospital_id = current_user.hospital_id
        blood_stock.is_reserved = False
    
    db.commit()
    
    # Create notifications
    notification_donor = models.Notification(
        title="Donation Accepted",
        message=f"{current_user.hospital.name} has accepted your blood donation (Batch: {blood_stock.batch_number})",
        notification_type="SUCCESS",
        recipient_hospital_id=schedule.donating_hospital_id
    )
    db.add(notification_donor)
    db.commit()
    
    return {"message": "Donation accepted successfully"}

@router.delete("/{schedule_id}")
async def cancel_donation_schedule(
    schedule_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a donation schedule"""
    schedule = db.query(models.DonationSchedule).filter(
        models.DonationSchedule.id == schedule_id,
        models.DonationSchedule.donating_hospital_id == current_user.hospital_id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation schedule not found"
        )
    
    if schedule.status == "ACCEPTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an accepted donation"
        )
    
    # Update schedule
    schedule.is_active = False
    schedule.status = "CANCELLED"
    
    # Unreserve blood stock
    blood_stock = db.query(models.BloodStock).filter(
        models.BloodStock.id == schedule.blood_stock_id
    ).first()
    
    if blood_stock:
        blood_stock.is_reserved = False
    
    db.commit()
    
    return {"message": "Donation schedule cancelled"}

@router.get("/critical-expiry")
async def get_critical_expiry_units(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get blood units from the current hospital that are expiring within 5 days.
    Used to auto-populate the donation schedule form.
    """
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    critical_threshold = get_utc_now() + timedelta(days=5)
    
    critical_units = db.query(models.BloodStock).filter(
        models.BloodStock.hospital_id == current_user.hospital_id,
        models.BloodStock.is_expired == False,
        models.BloodStock.is_reserved == False,
        models.BloodStock.expiry_date <= critical_threshold,
        models.BloodStock.expiry_date > get_utc_now(),
        models.BloodStock.units_available > 0
    ).order_by(models.BloodStock.expiry_date).all()
    
    return critical_units
