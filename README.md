# BloodLink Uganda 🩸

A modern blood donation management system designed to address blood scarcity in Uganda's national blood bank. BloodLink helps hospitals manage blood requests, track inventory, handle emergencies, and coordinate between different healthcare facilities.

## 🌟 Features

### Core Functionality
- **Hospital Code Authentication** - Secure login with hospital-specific codes
- **Emergency Blood Requests** - Real-time emergency alerts with wide display
- **Inventory Management** - Track blood stock with expiry date monitoring
- **Order Management** - Priority-based blood ordering (Normal, Critical, Very Critical)
- **Multi-Hospital Support** - Government (G), Private (P), and Non-profit (N) hospitals
- **Role-Based Access Control** - Different permissions for hospital staff, blood bank staff, and admins

### Modern UI Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Calming Color Palette** - Medical-focused UI with blues and greens
- **Real-time Notifications** - Toast notifications for important updates
- **Dashboard Analytics** - Visual overview of orders, stock, and emergencies
- **Professional Medical Interface** - User-friendly design that reduces anxiety

## 🏗️ Architecture

- **Backend**: FastAPI with PostgreSQL, JWT authentication, SQLAlchemy ORM
- **Frontend**: React 18 with TypeScript, Tailwind CSS, React Router
- **Database**: PostgreSQL with comprehensive medical data models
- **Authentication**: JWT tokens with role-based access control
- **Containerization**: Docker and Docker Compose for easy deployment

## 🚀 Quick Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd BloodLink
```

### 2. Backend Setup

#### Using Docker (Recommended)
```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Create virtual environment
cd backend
python -m venv bloodlinkenv
source bloodlinkenv/bin/activate  # On Windows: bloodlinkenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp ../env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Seed sample data
python seed_data.py

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Manual PostgreSQL Setup
```bash
# Create database
createdb bloodlink_db

# Create user (optional)
psql -c "CREATE USER bloodlink_user WITH PASSWORD 'bloodlink_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE bloodlink_db TO bloodlink_user;"

# Continue with backend setup above
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## 🔐 Test Credentials

After running the seed script, you can login with these test accounts:

| Email | Password | Role | Hospital |
|-------|----------|------|----------|
| admin@mulago.ug | admin123 | Blood Bank Staff | Mulago National Referral Hospital |
| staff@nakasero.com | staff123 | Hospital Staff | Nakasero Hospital |
| bloodbank@mengo.ug | mengo123 | Hospital Staff | Mengo Hospital |

## 🏥 Hospital Codes Format

The system uses a specific format for hospital codes:
- **G** = Government hospitals (e.g., GMUL2024)
- **P** = Private hospitals (e.g., PNAK2024)  
- **N** = Non-profit hospitals (e.g., NMEN2024)

## 📊 Key Components

### Dashboard Features
- **Pending Orders Count** - Track blood requests awaiting approval
- **Critical Orders Alert** - Highlight urgent blood needs
- **Stock Alerts** - Monitor blood approaching expiry dates
- **Emergency Display** - Wide alerts for critical situations
- **Quick Actions** - One-click access to common tasks

### Blood Management
- **Blood Types**: A+, A-, B+, B-, AB+, AB-, O+, O-
- **Components**: Whole Blood, Packed Cells, Fresh Frozen Plasma, Platelets, Cryoprecipitate
- **Priority Levels**: Normal, Critical, Very Critical
- **Status Tracking**: Pending, Approved, Fulfilled, Rejected, Cancelled

### Emergency System
- **Real-time Alerts** - Broadcast emergency requests to all hospitals
- **Response Tracking** - Monitor which hospitals can assist
- **Contact Information** - Direct communication channels
- **Deadline Management** - Time-sensitive request handling

## 🛠️ Development

### Backend Development
```bash
cd backend

# Run tests
python -m pytest

# Format code
black app/
isort app/

# Type checking
mypy app/

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Frontend Development
```bash
cd frontend

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📝 API Documentation

The API documentation is automatically generated and available at:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### Key Endpoints
- `POST /api/auth/token` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/users/dashboard` - Dashboard data
- `POST /api/orders/` - Create blood order
- `POST /api/orders/emergency` - Create emergency request
- `GET /api/bloodstock/` - Blood inventory
- `GET /api/bloodstock/near-expiry` - Expiry alerts

## Uganda Context

This system is specifically designed for Uganda's healthcare environment:

- **Multi-language Support** - Ready for English and local languages
- **Regional Hospitals** - Supports Central, Northern, Eastern, Western regions
- **Government Integration** - Compatible with Uganda's health ministry systems
- **Mobile-First** - Optimized for mobile usage in rural areas
- **Offline Capability** - Future-ready for intermittent connectivity

## 🔧 Configuration

### Environment Variables

```bash
# App Configuration
APP_NAME=BloodLink
ENVIRONMENT=development
DEBUG=true

# Database
DATABASE_URL=postgresql://bloodlink_user:bloodlink_password@localhost:5432/bloodlink_db

# Security
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3000,http://localhost:5173
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation at `/docs`

## 🎯 Roadmap

- [ ] SMS notifications integration
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Offline synchronization
- [ ] Integration with national health systems
- [ ] Blood donation campaign management
- [ ] Volunteer donor tracking

---

**BloodLink Uganda** - Saving lives through better blood management 🩸❤️ 