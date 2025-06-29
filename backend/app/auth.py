from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os
from dotenv import load_dotenv

from . import models, schemas
from .database import get_db

load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """Authenticate user with username and password."""
    user = db.query(models.User).filter(
        (models.User.username == username) | (models.User.email == username)
    ).first()
    
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    """Verify JWT token and return token data."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    return token_data

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    return user

def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(allowed_roles: list):
    """Decorator to require specific user roles."""
    def role_checker(current_user: models.User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker

def require_hospital_access(hospital_id: int = None):
    """Ensure user has access to specific hospital data."""
    def hospital_checker(current_user: models.User = Depends(get_current_active_user)):
        # Admins and blood bank staff can access all hospitals
        if current_user.role in [models.UserRole.ADMIN, models.UserRole.BLOOD_BANK_STAFF]:
            return current_user
        
        # Hospital staff can only access their own hospital
        if hospital_id and current_user.hospital_id != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this hospital's data"
            )
        
        return current_user
    return hospital_checker

def create_user(db: Session, user_create: schemas.UserCreate) -> models.User:
    """Create a new user account."""
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == user_create.email) | 
        (models.User.username == user_create.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Find hospital by code
    hospital = db.query(models.Hospital).filter(
        models.Hospital.hospital_code == user_create.hospital_code
    ).first()
    
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hospital code"
        )
    
    if not hospital.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital is not active"
        )
    
    # Create user
    hashed_password = get_password_hash(user_create.password)
    db_user = models.User(
        email=user_create.email,
        username=user_create.username,
        hashed_password=hashed_password,
        full_name=user_create.full_name,
        phone=user_create.phone,
        role=user_create.role,
        position=user_create.position,
        hospital_id=hospital.id,
        is_verified=False  # Require verification for new accounts
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

def verify_hospital_code(db: Session, hospital_code: str) -> Optional[models.Hospital]:
    """Verify if hospital code exists and is active."""
    return db.query(models.Hospital).filter(
        models.Hospital.hospital_code == hospital_code,
        models.Hospital.is_active == True
    ).first()

def generate_hospital_code(hospital_name: str, district: str) -> str:
    """Generate a unique hospital code based on name and district."""
    # Simple implementation - can be made more sophisticated
    name_part = ''.join(word[:2].upper() for word in hospital_name.split()[:2])
    district_part = district[:3].upper() if district else "UGA"
    
    # Add timestamp for uniqueness
    timestamp = datetime.now().strftime("%y%m")
    
    return f"{name_part}{district_part}{timestamp}"
