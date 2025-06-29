from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.BloodOrder)
async def create_blood_order(
    order_data: schemas.BloodOrderCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new blood order"""
    order = models.BloodOrder(
        **order_data.dict(),
        hospital_id=current_user.hospital_id,
        created_by_user_id=current_user.id
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Create notification for blood bank staff
    notification = models.Notification(
        title=f"New {order.priority.value} Blood Order",
        message=f"Hospital {current_user.hospital.name} requested {order.units_requested} units of {order.blood_type.value}",
        notification_type="CRITICAL" if order.priority == models.Priority.VERY_CRITICAL else "WARNING",
        recipient_hospital_id=None  # Send to blood bank
    )
    db.add(notification)
    db.commit()
    
    return order

@router.get("/", response_model=List[schemas.BloodOrder])
async def list_blood_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    blood_type: Optional[str] = Query(None),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """List blood orders with filtering"""
    query = db.query(models.BloodOrder)
    
    # Hospital staff can only see their hospital's orders
    if current_user.role == models.UserRole.HOSPITAL_STAFF:
        query = query.filter(models.BloodOrder.hospital_id == current_user.hospital_id)
    
    # Apply filters
    if status:
        query = query.filter(models.BloodOrder.status == status)
    if priority:
        query = query.filter(models.BloodOrder.priority == priority)
    if blood_type:
        query = query.filter(models.BloodOrder.blood_type == blood_type)
    
    orders = query.order_by(desc(models.BloodOrder.created_at)).offset(skip).limit(limit).all()
    return orders

@router.get("/{order_id}", response_model=schemas.BloodOrder)
async def get_blood_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific blood order"""
    order = db.query(models.BloodOrder).filter(models.BloodOrder.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check access permissions
    if (current_user.role == models.UserRole.HOSPITAL_STAFF and 
        order.hospital_id != current_user.hospital_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return order

@router.put("/{order_id}/approve")
async def approve_blood_order(
    order_id: int,
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF])),
    db: Session = Depends(get_db)
):
    """Approve a blood order (blood bank staff only)"""
    order = db.query(models.BloodOrder).filter(models.BloodOrder.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not pending"
        )
    
    order.status = models.OrderStatus.APPROVED
    order.approved_by = current_user.full_name or current_user.username
    order.approved_at = datetime.utcnow()
    
    db.commit()
    
    # Send notification to requesting hospital
    notification = models.Notification(
        title="Blood Order Approved",
        message=f"Your order for {order.units_requested} units of {order.blood_type.value} has been approved",
        notification_type="SUCCESS",
        recipient_hospital_id=order.hospital_id
    )
    db.add(notification)
    db.commit()
    
    return {"message": "Order approved successfully"}

@router.post("/emergency", response_model=schemas.EmergencyRequest)
async def create_emergency_request(
    request_data: schemas.EmergencyRequestCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create an emergency blood request"""
    emergency_request = models.EmergencyRequest(
        **request_data.dict(),
        hospital_id=current_user.hospital_id
    )
    
    db.add(emergency_request)
    db.commit()
    db.refresh(emergency_request)
    
    # Create wide display notification for all hospitals
    notification = models.Notification(
        title="EMERGENCY BLOOD REQUEST",
        message=f"URGENT: {current_user.hospital.name} needs {emergency_request.units_needed} units of {emergency_request.blood_type.value}. Patient condition: {emergency_request.patient_condition}",
        notification_type="CRITICAL",
        recipient_hospital_id=None  # Broadcast to all
    )
    db.add(notification)
    db.commit()
    
    return emergency_request

@router.get("/emergency/active", response_model=List[schemas.EmergencyRequest])
async def list_active_emergencies(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all active emergency requests for wide display"""
    emergency_requests = db.query(models.EmergencyRequest).filter(
        models.EmergencyRequest.is_active == True,
        models.EmergencyRequest.response_deadline > datetime.utcnow()
    ).order_by(desc(models.EmergencyRequest.created_at)).all()
    
    return emergency_requests

@router.post("/emergency/{request_id}/respond", response_model=schemas.EmergencyResponse)
async def respond_to_emergency(
    request_id: int,
    response_data: schemas.EmergencyResponseCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Respond to an emergency blood request"""
    emergency_request = db.query(models.EmergencyRequest).filter(
        models.EmergencyRequest.id == request_id
    ).first()
    
    if not emergency_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency request not found"
        )
    
    if not emergency_request.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Emergency request is no longer active"
        )
    
    response = models.EmergencyResponse(
        emergency_request_id=request_id,
        responding_hospital_id=current_user.hospital_id,
        units_offered=response_data.units_offered,
        response_message=response_data.response_message,
        contact_person=response_data.contact_person,
        contact_phone=response_data.contact_phone,
        estimated_availability=response_data.estimated_availability
    )
    
    db.add(response)
    db.commit()
    db.refresh(response)
    
    # Notify the requesting hospital
    notification = models.Notification(
        title="Emergency Response Received",
        message=f"{current_user.hospital.name} can provide {response.units_offered} units. Contact: {response.contact_person} ({response.contact_phone})",
        notification_type="SUCCESS",
        recipient_hospital_id=emergency_request.hospital_id,
        action_url=f"/emergency/{request_id}/responses"
    )
    db.add(notification)
    db.commit()
    
    return response
