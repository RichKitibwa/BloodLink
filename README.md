# 🩸 BloodLink - Uganda Blood Donation Management System

A blood donation and inventory management system designed to address blood scarcity in Uganda's healthcare system.

## 🎯 Purpose

BloodLink addresses critical challenges in Uganda's blood supply chain:
- **High TTI Prevalence**: 8.7-13.8% of blood donations have transfusion-transmissible infections
- **Supply Shortage**: Only 300,000 units collected in 2021/2022, far below demand
- **Regional Disparities**: Northern Uganda has higher infection rates requiring targeted allocation
- **Emergency Response Gaps**: Need for real-time coordination between hospitals and blood banks

## 🚀 Features

- 🏥 **Hospital Management** - Hospital registration and blood inventory tracking
- 🩸 **Blood Inventory** - Blood type tracking (A+, A-, B+, B-, AB+, AB-, O+, O-)
- 📋 **Order Management** - Blood request and approval workflow
- 👥 **User Management** - Role-based access control with secure authentication
- 📊 **Basic Reporting** - Blood supply and demand tracking

## 🛠 Technology Stack

- **FastAPI** - Modern, fast web framework for building APIs
- **PostgreSQL** - Robust relational database
- **SQLAlchemy** - SQL toolkit and ORM
- **Alembic** - Database migration tool
- **React + TypeScript** - Modern frontend framework
- **Docker** - Containerization for easy deployment

## 📦 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js (for frontend development)

### 1. Clone and Setup
```bash
git clone https://github.com/your-username/bloodlink.git
cd bloodlink

# Create React frontend
npm create vite@latest frontend -- --template react-ts

# Run setup script
bash scripts/setup.sh
```

### 2. Manual Setup (Alternative)
```bash
# Copy environment file
cp env.example .env

# Start services
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head
```

### 3. Access the Application

- **API Documentation**: http://localhost:8000/docs
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **Database**: localhost:5432

## 🔧 Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Operations
```bash
# Generate migration
docker-compose exec backend alembic revision --autogenerate -m "Description"

# Apply migrations
docker-compose exec backend alembic upgrade head
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/token` - Login and get access token

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/` - List users (admin only)

### Hospitals
- `GET /api/bloodstock/` - Get blood inventory
- `POST /api/bloodstock/` - Add blood units

### Orders
- `GET /api/orders/` - List blood orders
- `POST /api/orders/` - Create new blood order

## 🔒 Security

- JWT Authentication
- Role-based access control
- CORS protection
- Password hashing with bcrypt

## 🚀 Deployment

### Development
```bash
docker-compose up -d
```

### Production
Deploy to any platform supporting Docker:
- **Railway** - Easy deployment with PostgreSQL
- **Heroku** - With Heroku Postgres add-on
- **DigitalOcean App Platform** - Managed containers

## 📝 Environment Variables

```env
# Basic configuration
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/bloodlink_db
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

---

**BloodLink** - Saving lives through technology 🩸❤️ 