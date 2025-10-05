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

@router.post("/", response_model=schemas.BloodRequest, status_code=status.HTTP_201_CREATED)
async def create_blood_request(
    request_data: schemas.BloodRequestCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a blood request from the current hospital to another hospital (or broadcast to all).
    Lab techs and hospital staff can request blood from other hospitals.
    """
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    # Validate target hospital exists if specified
    if request_data.target_hospital_id:
        target_hospital = db.query(models.Hospital).filter(
            models.Hospital.id == request_data.target_hospital_id,
            models.Hospital.is_active == True
        ).first()
        
        if not target_hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target hospital not found"
            )
        
        if target_hospital.id == current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot request blood from your own hospital"
            )
    
    # Create blood request
    blood_request = models.BloodRequest(
        requesting_hospital_id=current_user.hospital_id,
        target_hospital_id=request_data.target_hospital_id,
        created_by_user_id=current_user.id,
        blood_type=request_data.blood_type,
        component=request_data.component,
        units_requested=request_data.units_requested,
        priority=request_data.priority,
        reason=request_data.reason,
        patient_details=request_data.patient_details,
        urgency_notes=request_data.urgency_notes,
        expected_use_date=request_data.expected_use_date,
        status=models.OrderStatus.PENDING
    )
    
    db.add(blood_request)
    db.commit()
    db.refresh(blood_request)
    
    # Create notification for target hospital(s)
    notification_message = (
        f"{current_user.hospital.name} is requesting {request_data.units_requested} units of "
        f"{request_data.blood_type.value} {request_data.component.value}"
    )
    
    if request_data.priority in [models.Priority.CRITICAL, models.Priority.VERY_CRITICAL]:
        notification_type = "CRITICAL"
    else:
        notification_type = "INFO"
    
    notification = models.Notification(
        title=f"{'URGENT ' if notification_type == 'CRITICAL' else ''}Blood Request",
        message=notification_message,
        notification_type=notification_type,
        recipient_hospital_id=request_data.target_hospital_id,  # None for broadcast
        action_url=f"/requests/{blood_request.id}"
    )
    db.add(notification)
    db.commit()
    
    return blood_request

@router.get("/", response_model=List[schemas.BloodRequest])
async def list_blood_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    blood_type: Optional[str] = Query(None),
    show_incoming: bool = Query(True, description="Show requests sent to my hospital"),
    show_outgoing: bool = Query(True, description="Show requests from my hospital"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List blood requests.
    - Incoming: Requests directed to the current user's hospital
    - Outgoing: Requests created by the current user's hospital
    """
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    query = db.query(models.BloodRequest)
    
    # Filter by incoming/outgoing
    conditions = []
    if show_incoming:
        # Requests targeted at my hospital or broadcast (target_hospital_id is None)
        conditions.append(
            or_(
                models.BloodRequest.target_hospital_id == current_user.hospital_id,
                models.BloodRequest.target_hospital_id.is_(None)
            )
        )
    if show_outgoing:
        # Requests created by my hospital
        conditions.append(models.BloodRequest.requesting_hospital_id == current_user.hospital_id)
    
    if conditions:
        if len(conditions) == 2:
            query = query.filter(or_(*conditions))
        else:
            query = query.filter(conditions[0])
    else:
        # If neither incoming nor outgoing, return empty
        return []
    
    # Apply additional filters
    if status_filter:
        query = query.filter(models.BloodRequest.status == status_filter)
    if priority:
        query = query.filter(models.BloodRequest.priority == priority)
    if blood_type:
        query = query.filter(models.BloodRequest.blood_type == blood_type)
    
    requests = query.order_by(desc(models.BloodRequest.created_at)).all()
    return requests

@router.get("/pending", response_model=List[schemas.BloodRequest])
async def get_pending_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get pending blood requests directed to the current user's hospital.
    This is used for the "Pending Orders" card on the dashboard.
    """
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    pending_requests = db.query(models.BloodRequest).filter(
        or_(
            models.BloodRequest.target_hospital_id == current_user.hospital_id,
            models.BloodRequest.target_hospital_id.is_(None)
        ),
        models.BloodRequest.status == models.OrderStatus.PENDING
    ).order_by(
        models.BloodRequest.priority.desc(),
        models.BloodRequest.created_at.desc()
    ).all()
    
    return pending_requests

@router.get("/{request_id}", response_model=schemas.BloodRequest)
async def get_blood_request(
    request_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific blood request"""
    blood_request = db.query(models.BloodRequest).filter(
        models.BloodRequest.id == request_id
    ).first()
    
    if not blood_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    
    # Check if user has access to this request
    if (blood_request.requesting_hospital_id != current_user.hospital_id and
        blood_request.target_hospital_id != current_user.hospital_id and
        blood_request.target_hospital_id is not None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return blood_request

@router.post("/{request_id}/respond", response_model=schemas.BloodRequestResponse)
async def respond_to_request(
    request_id: int,
    response_data: schemas.BloodRequestResponseCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Respond to a blood request with an offer"""
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a hospital"
        )
    
    blood_request = db.query(models.BloodRequest).filter(
        models.BloodRequest.id == request_id
    ).first()
    
    if not blood_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    
    if blood_request.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not pending"
        )
    
    if blood_request.requesting_hospital_id == current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot respond to your own request"
        )
    
    # Check if already responded
    existing_response = db.query(models.BloodRequestResponse).filter(
        models.BloodRequestResponse.blood_request_id == request_id,
        models.BloodRequestResponse.responding_hospital_id == current_user.hospital_id
    ).first()
    
    if existing_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already responded to this request"
        )
    
    # Create response
    response = models.BloodRequestResponse(
        blood_request_id=request_id,
        responding_hospital_id=current_user.hospital_id,
        responding_user_id=current_user.id,
        units_offered=response_data.units_offered,
        response_message=response_data.response_message,
        estimated_availability=response_data.estimated_availability,
        status="OFFERED"
    )
    
    db.add(response)
    db.commit()
    db.refresh(response)
    
    # Create notification for requesting hospital
    notification = models.Notification(
        title="Response to Blood Request",
        message=f"{current_user.hospital.name} can provide {response_data.units_offered} units",
        notification_type="SUCCESS",
        recipient_hospital_id=blood_request.requesting_hospital_id,
        action_url=f"/requests/{request_id}"
    )
    db.add(notification)
    db.commit()
    
    return response

@router.get("/{request_id}/responses", response_model=List[schemas.BloodRequestResponse])
async def get_request_responses(
    request_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all responses to a blood request"""
    blood_request = db.query(models.BloodRequest).filter(
        models.BloodRequest.id == request_id
    ).first()
    
    if not blood_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    
    # Check access
    if blood_request.requesting_hospital_id != current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the requesting hospital can view responses"
        )
    
    responses = db.query(models.BloodRequestResponse).filter(
        models.BloodRequestResponse.blood_request_id == request_id
    ).order_by(desc(models.BloodRequestResponse.created_at)).all()
    
    return responses

@router.post("/{request_id}/responses/{response_id}/accept")
async def accept_response(
    request_id: int,
    response_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Accept a response to a blood request"""
    blood_request = db.query(models.BloodRequest).filter(
        models.BloodRequest.id == request_id,
        models.BloodRequest.requesting_hospital_id == current_user.hospital_id
    ).first()
    
    if not blood_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    
    response = db.query(models.BloodRequestResponse).filter(
        models.BloodRequestResponse.id == response_id,
        models.BloodRequestResponse.blood_request_id == request_id
    ).first()
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found"
        )
    
    # Update response
    response.status = "ACCEPTED"
    response.accepted_at = get_utc_now()
    
    # Update blood request
    blood_request.status = models.OrderStatus.APPROVED
    blood_request.approved_at = get_utc_now()
    blood_request.approved_by_user_id = current_user.id
    
    db.commit()
    
    # Create notifications
    notification = models.Notification(
        title="Blood Request Response Accepted",
        message=f"{current_user.hospital.name} has accepted your offer",
        notification_type="SUCCESS",
        recipient_hospital_id=response.responding_hospital_id
    )
    db.add(notification)
    db.commit()
    
    return {"message": "Response accepted successfully"}

@router.put("/{request_id}", response_model=schemas.BloodRequest)
async def update_blood_request(
    request_id: int,
    update_data: schemas.BloodRequestUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a blood request (e.g., cancel, fulfill)"""
    blood_request = db.query(models.BloodRequest).filter(
        models.BloodRequest.id == request_id
    ).first()
    
    if not blood_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    
    # Check permissions
    can_update = (
        blood_request.requesting_hospital_id == current_user.hospital_id or
        blood_request.target_hospital_id == current_user.hospital_id or
        current_user.role in [models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF]
    )
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    if update_data.status:
        blood_request.status = update_data.status
        
        if update_data.status == models.OrderStatus.FULFILLED:
            blood_request.fulfilled_at = get_utc_now()
        elif update_data.status == models.OrderStatus.REJECTED:
            blood_request.rejection_reason = update_data.rejection_reason
    
    blood_request.updated_at = get_utc_now()
    
    db.commit()
    db.refresh(blood_request)
    
    return blood_request

@router.delete("/{request_id}")
async def cancel_blood_request(
    request_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a blood request (only by the requesting hospital)"""
    blood_request = db.query(models.BloodRequest).filter(
        models.BloodRequest.id == request_id,
        models.BloodRequest.requesting_hospital_id == current_user.hospital_id
    ).first()
    
    if not blood_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    
    if blood_request.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending requests"
        )
    
    blood_request.status = models.OrderStatus.CANCELLED
    blood_request.updated_at = get_utc_now()
    
    db.commit()
    
    return {"message": "Blood request cancelled successfully"}
