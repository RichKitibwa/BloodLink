"""
Database seeding script for BloodLink Uganda
Creates sample hospitals, users, and initial data for testing
"""

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import engine, SessionLocal
from app import models, auth

def create_sample_hospitals(db: Session):
    """Create sample hospitals with different types"""
    hospitals = [
        {
            "name": "Mulago National Referral Hospital",
            "hospital_code": "GMUL2024",
            "email": "bloodbank@mulago.ug",
            "phone": "+256-414-554000",
            "address": "Mulago Hill, Kampala",
            "district": "Kampala",
            "region": "Central",
            "license_number": "UG-MH-001"
        },
        {
            "name": "Nakasero Hospital",
            "hospital_code": "PNAK2024", 
            "email": "lab@nakasero.com",
            "phone": "+256-312-531000",
            "address": "Nakasero Hill, Kampala",
            "district": "Kampala", 
            "region": "Central",
            "license_number": "UG-PH-002"
        },
        {
            "name": "Mengo Hospital",
            "hospital_code": "NMEN2024",
            "email": "bloodservice@mengo.ug",
            "phone": "+256-414-275741",
            "address": "Mengo, Kampala",
            "district": "Kampala",
            "region": "Central", 
            "license_number": "UG-NH-003"
        },
        {
            "name": "Gulu Regional Referral Hospital",
            "hospital_code": "GGUL2024",
            "email": "bloodbank@gulurh.ug",
            "phone": "+256-471-432240",
            "address": "Gulu Municipality",
            "district": "Gulu",
            "region": "Northern",
            "license_number": "UG-GH-004"
        },
        {
            "name": "Mbarara Regional Referral Hospital", 
            "hospital_code": "GMBA2024",
            "email": "lab@mbararah.ug",
            "phone": "+256-485-421067",
            "address": "Mbarara Municipality",
            "district": "Mbarara",
            "region": "Western",
            "license_number": "UG-GH-005"
        }
    ]
    
    created_hospitals = []
    for hospital_data in hospitals:
        # Check if hospital already exists
        existing = db.query(models.Hospital).filter(
            models.Hospital.hospital_code == hospital_data["hospital_code"]
        ).first()
        
        if not existing:
            hospital = models.Hospital(**hospital_data)
            db.add(hospital)
            db.commit()
            db.refresh(hospital)
            created_hospitals.append(hospital)
            print(f"Created hospital: {hospital.name} ({hospital.hospital_code})")
        else:
            created_hospitals.append(existing)
            print(f"Hospital already exists: {existing.name}")
    
    return created_hospitals

def create_sample_users(db: Session, hospitals: list):
    """Create sample users for each hospital"""
    users_data = [
        {
            "email": "admin@mulago.ug",
            "username": "mulago_admin",
            "password": "admin123",
            "full_name": "Dr. Sarah Namukasa",
            "phone": "+256-700-123456",
            "position": "Blood Bank Manager",
            "role": models.UserRole.BLOOD_BANK_STAFF,
            "hospital_code": "GMUL2024"
        },
        {
            "email": "staff@nakasero.com", 
            "username": "nakasero_staff",
            "password": "staff123",
            "full_name": "Moses Wamala",
            "phone": "+256-700-234567",
            "position": "Lab Technician",
            "role": models.UserRole.HOSPITAL_STAFF,
            "hospital_code": "PNAK2024"
        },
        {
            "email": "bloodbank@mengo.ug",
            "username": "mengo_blood",
            "password": "mengo123", 
            "full_name": "Grace Nakimuli",
            "phone": "+256-700-345678",
            "position": "Blood Services Coordinator",
            "role": models.UserRole.HOSPITAL_STAFF,
            "hospital_code": "NMEN2024"
        },
        {
            "email": "supervisor@gulurh.ug",
            "username": "gulu_supervisor",
            "password": "gulu123",
            "full_name": "Dr. John Okello",
            "phone": "+256-700-456789", 
            "position": "Lab Supervisor",
            "role": models.UserRole.BLOOD_BANK_STAFF,
            "hospital_code": "GGUL2024"
        },
        {
            "email": "tech@mbararah.ug",
            "username": "mbarara_tech",
            "password": "mbarara123",
            "full_name": "Agnes Tumusiime",
            "phone": "+256-700-567890",
            "position": "Medical Technologist",
            "role": models.UserRole.HOSPITAL_STAFF,
            "hospital_code": "GMBA2024"
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # Check if user already exists
        existing = db.query(models.User).filter(
            models.User.email == user_data["email"]
        ).first()
        
        if not existing:
            # Find hospital
            hospital = db.query(models.Hospital).filter(
                models.Hospital.hospital_code == user_data["hospital_code"]
            ).first()
            
            if hospital:
                hashed_password = auth.get_password_hash(user_data["password"])
                user = models.User(
                    email=user_data["email"],
                    username=user_data["username"],
                    hashed_password=hashed_password,
                    full_name=user_data["full_name"],
                    phone=user_data["phone"],
                    position=user_data["position"],
                    role=user_data["role"],
                    hospital_id=hospital.id,
                    is_active=True,
                    is_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                created_users.append(user)
                print(f"Created user: {user.full_name} ({user.email})")
            else:
                print(f"Hospital not found for code: {user_data['hospital_code']}")
        else:
            created_users.append(existing)
            print(f"User already exists: {existing.email}")
    
    return created_users

def create_sample_blood_stock(db: Session, hospitals: list):
    """Create sample blood stock data distributed across hospitals"""
    blood_types = [models.BloodType.O_POSITIVE, models.BloodType.A_POSITIVE, 
                   models.BloodType.B_POSITIVE, models.BloodType.AB_POSITIVE,
                   models.BloodType.O_NEGATIVE, models.BloodType.A_NEGATIVE]
    
    components = [models.BloodComponent.WHOLE_BLOOD, models.BloodComponent.PACKED_CELLS,
                  models.BloodComponent.FRESH_FROZEN_PLASMA, models.BloodComponent.PLATELETS]
    
    stock_data = []
    batch_counter = 1
    
    # Create blood stock for each hospital
    for hospital in hospitals:
        print(f"Creating blood stock for {hospital.name}...")
        
        for blood_type in blood_types:
            for component in components:
                # Create stock expiring soon (for alerts) - some hospitals
                if batch_counter % 3 == 0:  # Every 3rd batch expires soon
                    near_expiry_stock = models.BloodStock(
                        blood_type=blood_type,
                        component=component,
                        units_available=5,
                        expiry_date=datetime.now() + timedelta(days=3),
                        donation_date=datetime.now() - timedelta(days=30),
                        batch_number=f"BL{batch_counter:04d}",
                        source_location="Uganda Blood Transfusion Service",
                        hospital_id=hospital.id,  # Link to specific hospital
                        is_expired=False,
                        is_reserved=False
                    )
                    stock_data.append(near_expiry_stock)
                    batch_counter += 1
                
                # Create normal stock with varying quantities based on hospital
                base_units = 15
                if hospital.region == "Central":
                    base_units = 25  # Central hospitals have more stock
                elif hospital.region == "Northern":
                    base_units = 12
                elif hospital.region == "Western":
                    base_units = 18
                else:
                    base_units = 10
                
                # Add some randomness but ensure minimum availability
                import random
                units = max(5, base_units + random.randint(-5, 10))
                
                normal_stock = models.BloodStock(
                    blood_type=blood_type,
                    component=component,
                    units_available=units,
                    expiry_date=datetime.now() + timedelta(days=random.randint(15, 60)),
                    donation_date=datetime.now() - timedelta(days=random.randint(1, 14)),
                    batch_number=f"BL{batch_counter:04d}",
                    source_location="Uganda Blood Transfusion Service",
                    hospital_id=hospital.id,  # Link to specific hospital
                    is_expired=False,
                    is_reserved=False
                )
                stock_data.append(normal_stock)
                batch_counter += 1
    
    # Also create some unallocated/central blood bank stock (hospital_id=None)
    print("Creating central blood bank stock...")
    for blood_type in blood_types[:4]:  # Only create for common types
        for component in components[:2]:  # Only whole blood and packed cells
            central_stock = models.BloodStock(
                blood_type=blood_type,
                component=component,
                units_available=50,  # Large quantities at central blood bank
                expiry_date=datetime.now() + timedelta(days=45),
                donation_date=datetime.now() - timedelta(days=2),
                batch_number=f"CBB{batch_counter:04d}",
                source_location="Uganda Blood Transfusion Service - Central",
                hospital_id=None,  # Central stock not allocated to specific hospital
                is_expired=False,
                is_reserved=False
            )
            stock_data.append(central_stock)
            batch_counter += 1
    
    # Add stock to database
    created_stock = []
    for stock in stock_data:
        existing = db.query(models.BloodStock).filter(
            models.BloodStock.batch_number == stock.batch_number
        ).first()
        
        if not existing:
            db.add(stock)
            created_stock.append(stock)
    
    db.commit()
    print(f"Created {len(created_stock)} blood stock entries")
    
    # Print summary by hospital
    print("\n📊 Blood Stock Summary:")
    for hospital in hospitals:
        hospital_stock = db.query(models.BloodStock).filter(
            models.BloodStock.hospital_id == hospital.id
        ).count()
        print(f"  {hospital.name}: {hospital_stock} batches")
    
    central_stock = db.query(models.BloodStock).filter(
        models.BloodStock.hospital_id.is_(None)
    ).count()
    print(f"  Central Blood Bank: {central_stock} batches")
    
    return created_stock

def main():
    """Main seeding function"""
    print("Starting database seeding...")
    
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create sample data
        hospitals = create_sample_hospitals(db)
        users = create_sample_users(db, hospitals)
        stock = create_sample_blood_stock(db, hospitals)
        
        print(f"\n✅ Seeding completed successfully!")
        print(f"Created {len(hospitals)} hospitals")
        print(f"Created {len(users)} users") 
        print(f"Created {len(stock)} blood stock entries")
        
        print("\n🔐 Sample Login Credentials:")
        print("Email: admin@mulago.ug | Password: admin123 | Role: Blood Bank Staff")
        print("Email: staff@nakasero.com | Password: staff123 | Role: Hospital Staff")
        print("Email: bloodbank@mengo.ug | Password: mengo123 | Role: Hospital Staff")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main() 
    