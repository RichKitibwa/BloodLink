#!/bin/bash

# BloodLink Setup Script
# Simple setup for the blood donation app

set -e

echo "🩸 BloodLink - Uganda Blood Donation Management System"
echo "=================================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/alembic/versions
echo "✅ Directories created"
echo ""

# Check if frontend exists, if not create it
if [ ! -d "frontend" ]; then
    echo "📝 Frontend directory not found. Please create it first with:"
    echo "   npm create vite@latest frontend -- --template react-ts"
    echo "   Then run this setup script again."
    exit 1
fi

# Install frontend dependencies if package.json exists
if [ -f "frontend/package.json" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    echo "✅ Frontend dependencies installed"
    echo ""
fi

# Build and start services
echo "🚀 Building and starting services..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec -T backend alembic upgrade head

echo ""
echo "👤 Creating initial admin user..."
docker-compose exec -T backend python -c "
import sys
sys.path.append('/app')
from app.database import SessionLocal
from app.auth import get_password_hash
from app.models import User
from datetime import datetime

try:
    db = SessionLocal()
    
    # Check if admin user already exists
    existing_admin = db.query(User).filter(User.email == 'admin@bloodlink.ug').first()
    if existing_admin:
        print('Admin user already exists')
    else:
        admin_user = User(
            email='admin@bloodlink.ug',
            full_name='System Administrator',
            hashed_password=get_password_hash('admin123'),
            role='admin',
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(admin_user)
        db.commit()
        print('✅ Admin user created successfully')
        print('   Email: admin@bloodlink.ug')
        print('   Password: admin123')
        print('   ⚠️  Please change the password after first login')
    
    db.close()
except Exception as e:
    print(f'❌ Failed to create admin user: {e}')
    sys.exit(1)
"

echo ""
echo "🎉 BloodLink setup completed successfully!"
echo ""
echo "📍 Access Points:"
echo "   • API Documentation: http://localhost:8000/docs"
echo "   • Backend API: http://localhost:8000"
echo "   • Frontend: http://localhost:3000"
echo "   • Health Check: http://localhost:8000/api/health"
echo ""
echo "🔧 Useful Commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart services: docker-compose restart"
echo ""
echo "❤️ Happy coding! Save lives with BloodLink 🩸" 