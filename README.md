# oneDC - Project Management & Time Tracking System

A comprehensive project management, time tracking, and resource allocation system built with .NET Core and Angular.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [User Documentation](#user-documentation)
- [Technical Stack](#technical-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Support](#support)

---

## 🎯 Overview

oneDC is an enterprise project management and time tracking system designed to help organizations:
- Manage projects and tasks efficiently
- Track time across multiple projects
- Manage resource allocations
- Approve timesheets and workflows
- Generate comprehensive reports

### Key Capabilities
- ✅ Role-based access control (Admin, Approver, Employee)
- ✅ Multi-project task management
- ✅ Timesheet submission and approval workflows
- ✅ Resource allocation planning
- ✅ Real-time reporting and analytics
- ✅ User and client management
- ✅ RESTful API architecture

---

## 🚀 Features

### For Administrators
- Complete user management (create, edit, delete users)
- Client and project management
- Resource allocation across projects
- System-wide reporting and analytics
- Timesheet approval workflows
- Holiday and configuration management

### For Approvers
- Manage projects (as Default Approver or Team Member)
- Create and assign tasks to team members
- Review and approve/reject timesheets
- Monitor team progress
- Generate project-specific reports

### For Employees
- View assigned tasks
- Update task status (New → In Progress → Completed)
- Create and submit timesheet entries
- Track personal work hours
- View approval status

---

## 📚 User Documentation

Comprehensive guides are available for all user roles:

### 📘 [Admin User Guide](./docs/USER_GUIDE_ADMIN.md)
Complete documentation for system administrators with full access to all features.

**Topics Covered:**
- User, client, and project management
- Task creation and assignment
- Resource allocation management
- Timesheet approval workflows
- System-wide reporting
- Best practices and troubleshooting

### 📗 [Approver User Guide](./docs/USER_GUIDE_APPROVER.md)
Guide for project managers and team leads who manage projects and approve timesheets.

**Topics Covered:**
- Project access model (Default Approver + Team Member)
- Task management and assignment
- Timesheet review and approval
- Team supervision
- Project-specific reporting
- Approval best practices

### 📙 [Employee User Guide](./docs/USER_GUIDE_EMPLOYEE.md)
Instructions for employees who work on tasks and submit timesheets.

**Topics Covered:**
- Viewing and updating assigned tasks
- Creating and submitting timesheets
- Understanding approval workflows
- Profile management
- Daily and weekly workflows

### ⚡ [Quick Reference Guide](./docs/QUICK_REFERENCE.md)
One-page cheat sheet for all roles - perfect for printing and keeping handy!

### 🔐 [Role Access Matrix](./docs/ROLE_ACCESS_MATRIX.md)
Visual reference showing exactly what each role can access and do in the system.

### 📖 [Documentation Index](./docs/README.md)
Complete documentation index with links to all guides and resources.

---

## 🛠 Technical Stack

### Backend
- **Framework:** .NET Core 8.0
- **Language:** C# 12
- **Database:** PostgreSQL
- **ORM:** Entity Framework Core
- **Authentication:** JWT Bearer Tokens
- **API Style:** RESTful

### Frontend
- **Framework:** Angular 18
- **Language:** TypeScript
- **UI Library:** Bootstrap 5
- **State Management:** Angular Signals
- **HTTP Client:** Angular HttpClient
- **Notifications:** ngx-toastr

### DevOps
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Web Server:** Nginx (production)
- **Reverse Proxy:** Configured via Nginx

---

## 🏁 Getting Started

### Prerequisites
- .NET 8.0 SDK
- Node.js 18+ and npm
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Quick Start

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/oneDC.git
cd oneDC
```

#### 2. Backend Setup
```bash
cd backend/OneDc.Api

# Create .env file with database connection
echo "DATABASE_CONNECTION_STRING=Host=localhost;Port=5432;Database=onedc_dev;Username=postgres;Password=yourpassword" > .env

# Restore packages
dotnet restore

# Run migrations
dotnet ef database update

# Start backend server
dotnet run --urls http://localhost:5260
```

Backend will be available at: `http://localhost:5260`

#### 3. Frontend Setup
```bash
cd frontend/onedc

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will be available at: `http://localhost:4200`

### Default Admin Account
After running migrations, a default admin account is created:
- **Email:** admin@onedc.com
- **Password:** Admin@123

**⚠️ Important:** Change the default password immediately after first login!

---

## 📁 Project Structure

```
oneDC/
├── backend/                    # .NET Core Backend
│   ├── OneDc.Api/             # API Controllers & Endpoints
│   ├── OneDc.Domain/          # Domain Entities
│   ├── OneDc.Infrastructure/  # Database Context & Migrations
│   ├── OneDc.Repository/      # Data Access Layer
│   └── OneDc.Services/        # Business Logic Layer
│
├── frontend/                   # Angular Frontend
│   └── onedc/
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/      # Services, Guards, Interceptors
│       │   │   ├── features/  # Feature Modules (Tasks, Timesheets, etc.)
│       │   │   └── shared/    # Shared Components
│       │   └── assets/        # Static Assets
│       └── public/            # Public Files
│
├── ops/                        # Operations & Deployment
│   └── docker-compose.yml     # Docker Compose Configuration
│
└── docs/                       # Documentation
    ├── README.md              # Documentation Index
    ├── USER_GUIDE_ADMIN.md   # Admin Guide
    ├── USER_GUIDE_APPROVER.md # Approver Guide
    ├── USER_GUIDE_EMPLOYEE.md # Employee Guide
    ├── QUICK_REFERENCE.md    # Quick Reference
    └── ROLE_ACCESS_MATRIX.md # Role Access Matrix
```

---

## 🚢 Deployment

### Using Docker Compose

1. **Build and Run All Services**
```bash
cd ops
docker-compose up -d
```

This will start:
- PostgreSQL database
- .NET Core API
- Angular frontend
- Nginx reverse proxy

2. **Access the Application**
- Frontend: `http://localhost`
- API: `http://localhost/api`

### Manual Deployment

See [DEPLOYMENT_QUICK_REF.md](./DEPLOYMENT_QUICK_REF.md) for detailed deployment instructions including:
- Production build steps
- Environment configuration
- Database setup
- Web server configuration
- SSL/TLS setup

---

## 🔧 Configuration

### Backend Configuration

Create `.env` file in `backend/OneDc.Api/`:
```env
DATABASE_CONNECTION_STRING=Host=localhost;Port=5432;Database=onedc_dev;Username=postgres;Password=yourpassword
JWT_SECRET=your-secret-key-min-32-characters
JWT_ISSUER=oneDC
JWT_AUDIENCE=oneDC-Users
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@onedc.com
```

### Frontend Configuration

Update `frontend/onedc/src/environments/`:
```typescript
// environment.ts (development)
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5260/api'
};

// environment.prod.ts (production)
export const environment = {
  production: true,
  apiBaseUrl: '/api'  // Uses Nginx proxy
};
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
dotnet test
```

### Frontend Tests
```bash
cd frontend/onedc
npm test
```

---

## 📊 Database Migrations

### Create New Migration
```bash
cd backend/OneDc.Infrastructure
dotnet ef migrations add MigrationName --startup-project ../OneDc.Api
```

### Apply Migrations
```bash
cd backend/OneDc.Api
dotnet ef database update
```

### Rollback Migration
```bash
dotnet ef database update PreviousMigrationName
```

---

## 🔐 Security

### Authentication
- JWT Bearer token authentication
- Token expiration: 24 hours
- Refresh tokens supported

### Authorization
- Role-based access control (RBAC)
- Three roles: Admin, Approver, Employee
- Granular permissions per role

### Password Policy
- Minimum 8 characters
- SHA256 hashing for password reset tokens
- Secure password reset via email

### Data Protection
- SQL injection prevention via EF Core
- XSS protection
- CORS configured for specific origins
- HTTPS enforced in production

---

## 🌐 API Documentation

### Base URL
- Development: `http://localhost:5260/api`
- Production: `https://your-domain.com/api`

### Authentication
All endpoints require JWT Bearer token except:
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Example API Call
```bash
# Login
curl -X POST http://localhost:5260/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onedc.com","password":"Admin@123"}'

# Use token in subsequent requests
curl -X GET http://localhost:5260/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Key Endpoints
- **Auth:** `/api/auth/*`
- **Users:** `/api/users/*`
- **Clients:** `/api/clients/*`
- **Projects:** `/api/projects/*`
- **Tasks:** `/api/tasks/*`
- **Timesheets:** `/api/timesheets/*`
- **Allocations:** `/api/allocations/*`
- **Approvals:** `/api/approvals/*`
- **Reports:** `/api/reports/*`

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Make changes and test thoroughly
3. Commit with clear messages
4. Create pull request
5. Wait for review and approval
6. Merge to `main`

### Code Style
- **Backend:** Follow C# coding conventions
- **Frontend:** Follow Angular style guide
- Use meaningful variable and function names
- Add comments for complex logic
- Write unit tests for new features

---

## 🐛 Troubleshooting

### Backend Won't Start
- Check PostgreSQL is running
- Verify connection string in `.env`
- Ensure migrations are applied
- Check port 5260 is available

### Frontend Won't Start
- Run `npm install` to ensure dependencies
- Check port 4200 is available
- Verify proxy.conf.json points to backend
- Clear npm cache: `npm cache clean --force`

### Database Connection Issues
- Verify PostgreSQL service is running
- Check credentials in connection string
- Ensure database exists
- Check firewall rules

### Authentication Issues
- Verify JWT_SECRET is set
- Check token expiration
- Clear browser cache and cookies
- Ensure clock sync on server

---

## 📞 Support

### For Users
- **Admin Guide:** [docs/USER_GUIDE_ADMIN.md](./docs/USER_GUIDE_ADMIN.md)
- **Approver Guide:** [docs/USER_GUIDE_APPROVER.md](./docs/USER_GUIDE_APPROVER.md)
- **Employee Guide:** [docs/USER_GUIDE_EMPLOYEE.md](./docs/USER_GUIDE_EMPLOYEE.md)
- **Quick Reference:** [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)

### For Developers
- **Backend README:** [backend/README.md](./backend/README.md)
- **Frontend README:** [frontend/onedc/README.md](./frontend/onedc/README.md)
- **Deployment Guide:** [DEPLOYMENT_QUICK_REF.md](./DEPLOYMENT_QUICK_REF.md)

### Contact
- **Email:** support@onedc.com
- **Issues:** Create an issue in the GitHub repository
- **Response Time:** Within 1 business day

---

## 📝 License

[Add your license information here]

---

## 🎉 Acknowledgments

Built with:
- .NET Core
- Angular
- PostgreSQL
- Bootstrap
- Entity Framework Core
- And many other amazing open-source projects

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Status:** Production Ready
