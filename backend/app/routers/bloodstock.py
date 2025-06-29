from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional
from datetime import datetime, timedelta

from .. import models, schemas, auth
from ..database import get_db

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
    is_expired = stock_data.expiry_date <= datetime.now()
    
    stock = models.BloodStock(
        **stock_data.dict(),
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
    if stock.expiry_date <= datetime.now():
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
