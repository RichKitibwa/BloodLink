from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from .. import models, schemas, auth
from ..database import get_db

def get_utc_now():
    """Get current UTC datetime that's timezone-aware"""
    return datetime.now(timezone.utc)

def make_timezone_aware(dt):
    """Make a datetime timezone-aware if it isn't already"""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

router = APIRouter()

@router.get("/", response_model=List[schemas.BloodStock])
async def list_blood_stock(
    skip: int = 0,
    limit: int = 100,
    blood_type: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    exclude_expired: bool = Query(True),
    near_expiry_days: int = Query(7),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """List blood stock with filtering and expiry tracking"""
    query = db.query(models.BloodStock)
    
    # Apply filters
    if blood_type:
        query = query.filter(models.BloodStock.blood_type == blood_type)
    if component:
        query = query.filter(models.BloodStock.component == component)
    if exclude_expired:
        query = query.filter(models.BloodStock.is_expired == False)
    
    # Hospital staff can only see their hospital's allocated stock
    if current_user.role == models.UserRole.HOSPITAL_STAFF:
        query = query.filter(
            or_(
                models.BloodStock.hospital_id == current_user.hospital_id,
                models.BloodStock.hospital_id.is_(None)  # Available stock
            )
        )
    
    stock = query.order_by(models.BloodStock.expiry_date).offset(skip).limit(limit).all()
    return stock

@router.get("/near-expiry", response_model=List[schemas.BloodStock])
async def get_near_expiry_stock(
    days: int = Query(7, ge=1, le=30),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get blood stock nearing expiry for notifications"""
    expiry_threshold = datetime.now() + timedelta(days=days)
    
    query = db.query(models.BloodStock).filter(
        and_(
            models.BloodStock.expiry_date <= expiry_threshold,
            models.BloodStock.expiry_date > datetime.now(),
            models.BloodStock.is_expired == False,
            models.BloodStock.units_available > 0
        )
    )
    
    # Hospital staff can only see their hospital's stock
    if current_user.role == models.UserRole.HOSPITAL_STAFF:
        query = query.filter(models.BloodStock.hospital_id == current_user.hospital_id)
    
    near_expiry = query.order_by(models.BloodStock.expiry_date).all()
    return near_expiry

@router.get("/summary", response_model=List[schemas.BloodStockSummary])
async def get_blood_stock_summary(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get blood stock summary by type and component"""
    # Calculate near expiry threshold
    near_expiry_date = datetime.now() + timedelta(days=7)
    
    # Query for stock summary
    query = db.query(
        models.BloodStock.blood_type,
        models.BloodStock.component,
        func.sum(models.BloodStock.units_available).label('total_units'),
        func.sum(
            func.case(
                (models.BloodStock.expiry_date <= near_expiry_date, models.BloodStock.units_available),
                else_=0
            )
        ).label('near_expiry_units')
    ).filter(
        models.BloodStock.is_expired == False,
        models.BloodStock.units_available > 0
    )
    
    # Hospital staff can only see their hospital's stock
    if current_user.role == models.UserRole.HOSPITAL_STAFF:
        query = query.filter(models.BloodStock.hospital_id == current_user.hospital_id)
    
    results = query.group_by(
        models.BloodStock.blood_type,
        models.BloodStock.component
    ).all()
    
    # Convert to response format
    summary = []
    for result in results:
        critical_threshold = 10  
        summary.append({
            "blood_type": result.blood_type,
            "component": result.component,
            "total_units": result.total_units or 0,
            "near_expiry_units": result.near_expiry_units or 0,
            "critical_level": (result.total_units or 0) < critical_threshold
        })
    
    return summary

@router.post("/", response_model=schemas.BloodStock)
async def add_blood_stock(
    stock_data: schemas.BloodStockCreate,
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF])),
    db: Session = Depends(get_db)
):
    """Add new blood stock (blood bank staff only)"""
    # Check if batch number already exists
    existing = db.query(models.BloodStock).filter(
        models.BloodStock.batch_number == stock_data.batch_number
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch number already exists"
        )
    
    # Check if already expired
    now = get_utc_now()
    expiry_date = make_timezone_aware(stock_data.expiry_date)
    is_expired = expiry_date <= now
    
    # Ensure we set hospital_id for the current user's hospital
    stock_data_dict = stock_data.dict()
    if current_user.hospital_id:
        stock_data_dict['hospital_id'] = current_user.hospital_id
    
    stock = models.BloodStock(
        **stock_data_dict,
        is_expired=is_expired
    )
    
    db.add(stock)
    db.commit()
    db.refresh(stock)
    
    return stock

@router.put("/{stock_id}", response_model=schemas.BloodStock)
async def update_blood_stock(
    stock_id: int,
    stock_update: schemas.BloodStockUpdate,
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF])),
    db: Session = Depends(get_db)
):
    """Update blood stock (blood bank staff only)"""
    stock = db.query(models.BloodStock).filter(models.BloodStock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood stock not found"
        )
    
    for field, value in stock_update.dict(exclude_unset=True).items():
        setattr(stock, field, value)
    
    # Auto-expire if past expiry date
    now = get_utc_now()
    expiry_date = make_timezone_aware(stock.expiry_date)
    if expiry_date <= now:
        stock.is_expired = True
    
    db.commit()
    db.refresh(stock)
    
    return stock

@router.put("/{stock_id}/allocate")
async def allocate_blood_stock(
    stock_id: int,
    hospital_id: int,
    units: int,
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF])),
    db: Session = Depends(get_db)
):
    """Allocate blood stock to a hospital"""
    stock = db.query(models.BloodStock).filter(models.BloodStock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood stock not found"
        )
    
    if stock.units_available < units:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient units available"
        )
    
    if stock.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot allocate expired blood"
        )
    
    # Update stock
    stock.units_available -= units
    stock.hospital_id = hospital_id
    
    db.commit()
    
    return {"message": f"Successfully allocated {units} units to hospital"}

@router.get("/search", response_model=List[schemas.BloodStockSearchResult])
async def search_blood_stock(
    blood_type: Optional[str] = Query(None, description="Blood type to search for (e.g., A+, B-, O+)"),
    component: Optional[str] = Query(None, description="Blood component type"),
    region: Optional[str] = Query(None, description="Filter by region (Central, Northern, Western, Eastern)"),
    district: Optional[str] = Query(None, description="Filter by specific district"),
    hospital_name: Optional[str] = Query(None, description="Search by hospital name (partial match)"),
    min_units: int = Query(1, ge=1, description="Minimum number of units required"),
    max_distance_km: Optional[int] = Query(None, ge=1, le=500, description="Maximum distance in kilometers from user's location"),
    exclude_expired: bool = Query(True, description="Exclude expired blood stock"),
    exclude_near_expiry: bool = Query(False, description="Exclude stock expiring within 3 days"),
    sort_by: str = Query("distance", description="Sort results by: distance, expiry_date, units_available"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Search for available blood stock by type and location from all hospitals.
    Laboratory technologists can find compatible blood matches for patients.
    """
    # Base query for available blood stock with hospital information
    query = db.query(
        models.BloodStock,
        models.Hospital
    ).join(
        models.Hospital, 
        models.BloodStock.hospital_id == models.Hospital.id,
        isouter=True
    ).filter(
        models.BloodStock.units_available >= min_units,
        models.BloodStock.is_reserved == False
    )
    
    # Apply blood type filter
    if blood_type:
        query = query.filter(models.BloodStock.blood_type == blood_type)
    
    # Apply component filter
    if component:
        query = query.filter(models.BloodStock.component == component)
    
    # Apply expiry filters
    if exclude_expired:
        query = query.filter(models.BloodStock.is_expired == False)
        query = query.filter(models.BloodStock.expiry_date > get_utc_now())
    
    if exclude_near_expiry:
        near_expiry_threshold = get_utc_now() + timedelta(days=3)
        query = query.filter(models.BloodStock.expiry_date > near_expiry_threshold)
    
    # Apply location filters
    if region:
        query = query.filter(models.Hospital.region.ilike(f"%{region}%"))
    
    if district:
        query = query.filter(models.Hospital.district.ilike(f"%{district}%"))
    
    if hospital_name:
        query = query.filter(models.Hospital.name.ilike(f"%{hospital_name}%"))
    
    # Filter to show only active hospitals
    query = query.filter(models.Hospital.is_active == True)
    
    # Execute query
    results = query.all()
    
    # Process results into response format
    search_results = []
    user_hospital = current_user.hospital
    
    for stock, hospital in results:
        if not hospital:  # Skip if no hospital (shouldn't happen with proper data)
            continue
            
        # Calculate days to expiry
        expiry_date = make_timezone_aware(stock.expiry_date)
        days_to_expiry = (expiry_date - get_utc_now()).days if expiry_date else 0
        
        # Determine availability status
        availability_status = "Available"
        if days_to_expiry <= 3:
            availability_status = "Expires Soon"
        elif days_to_expiry <= 0:
            availability_status = "Expired"
        
        # Calculate approximate distance (simplified - in real app would use GPS coordinates)
        distance_km = None
        if user_hospital and hospital:
            # Simple distance estimation based on region/district
            if user_hospital.region == hospital.region:
                if user_hospital.district == hospital.district:
                    distance_km = 5  # Same district
                else:
                    distance_km = 50  # Same region, different district
            else:
                distance_km = 200  # Different region
        
        # Apply distance filter if specified
        if max_distance_km and distance_km and distance_km > max_distance_km:
            continue
        
        search_results.append({
            "stock_id": stock.id,
            "blood_type": stock.blood_type.value,
            "component": stock.component.value,
            "units_available": stock.units_available,
            "expiry_date": stock.expiry_date,
            "days_to_expiry": days_to_expiry,
            "donation_date": stock.donation_date,
            "batch_number": stock.batch_number,
            "source_location": stock.source_location,
            "availability_status": availability_status,
            "hospital_id": hospital.id,
            "hospital_name": hospital.name,
            "hospital_code": hospital.hospital_code,
            "hospital_address": hospital.address,
            "hospital_district": hospital.district,
            "hospital_region": hospital.region,
            "hospital_phone": hospital.phone,
            "hospital_email": hospital.email,
            "estimated_distance_km": distance_km,
            "is_same_hospital": hospital.id == current_user.hospital_id if current_user.hospital_id else False
        })
    
    # Sort results
    if sort_by == "distance" and search_results:
        search_results.sort(key=lambda x: x["estimated_distance_km"] or 999)
    elif sort_by == "expiry_date":
        search_results.sort(key=lambda x: x["expiry_date"])
    elif sort_by == "units_available":
        search_results.sort(key=lambda x: x["units_available"], reverse=True)
    
    return search_results

@router.get("/alerts")
async def get_stock_alerts(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get stock alerts for dashboard"""
    alerts = []
    
    # Near expiry alerts
    near_expiry = db.query(models.BloodStock).filter(
        and_(
            models.BloodStock.expiry_date <= datetime.now() + timedelta(days=7),
            models.BloodStock.expiry_date > datetime.now(),
            models.BloodStock.is_expired == False,
            models.BloodStock.units_available > 0
        )
    )
    
    if current_user.role == models.UserRole.HOSPITAL_STAFF:
        near_expiry = near_expiry.filter(models.BloodStock.hospital_id == current_user.hospital_id)
    
    for stock in near_expiry.all():
        days_to_expiry = (stock.expiry_date - datetime.now()).days
        alerts.append({
            "type": "NEAR_EXPIRY",
            "severity": "WARNING" if days_to_expiry > 3 else "CRITICAL",
            "message": f"{stock.units_available} units of {stock.blood_type.value} {stock.component.value} expiring in {days_to_expiry} days",
            "blood_type": stock.blood_type,
            "component": stock.component,
            "units": stock.units_available,
            "expiry_date": stock.expiry_date
        })
    
    return {"alerts": alerts}
