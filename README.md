# Multi-Tenant SaaS Platform

A production-ready, multi-tenant SaaS application where multiple organizations can register, manage their teams, create projects, and track tasks with complete data isolation, role-based access control, and subscription plan limits.

## Features

- **Multi-Tenancy Architecture**: Complete data isolation between tenants using shared database with tenant_id filtering
- **Role-Based Access Control**: Three user roles (Super Admin, Tenant Admin, User) with granular permissions
- **Tenant Management**: Organizations can register with unique subdomains and manage subscription plans
- **User Management**: Tenant admins can add, update, and manage users within their organization
- **Project Management**: Create, update, and manage projects with subscription plan limits
- **Task Management**: Full task CRUD operations with assignment, priority, and status tracking
- **Subscription Plans**: Free, Pro, and Enterprise plans with configurable limits (users, projects)
- **Audit Logging**: Comprehensive audit trail for all important actions
- **JWT Authentication**: Secure stateless authentication with 24-hour token expiry
- **Dockerized Deployment**: Fully containerized application with Docker Compose
- **Automatic Database Initialization**: Migrations and seed data load automatically on startup

## Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS3 with responsive design

### DevOps
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15 (containerized)

## Architecture Overview

The application follows a three-tier architecture:

1. **Frontend Layer**: React SPA with role-based UI rendering
2. **Backend API Layer**: RESTful Express.js API with JWT authentication
3. **Data Layer**: PostgreSQL database with tenant isolation via tenant_id columns

### Multi-Tenancy Approach

The application uses **Shared Database + Shared Schema** with tenant_id column isolation:
- All tables (except super_admin users) include tenant_id
- All queries automatically filter by tenant_id from JWT token
- Super admin users have tenant_id = NULL and can access all tenants
- Foreign key constraints ensure data integrity with CASCADE deletes

### Data Flow

1. User logs in with email, password, and tenant subdomain
2. Backend validates credentials and generates JWT token with {userId, tenantId, role}
3. Frontend stores token and includes it in Authorization header for all requests
4. Backend middleware extracts tenant_id from token and filters all queries automatically
5. Authorization middleware checks user role for endpoint access

## Installation & Setup

### Prerequisites

- Docker and Docker Compose installed
- Git (for cloning repository)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sMultitennant
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

   This command will:
   - Start PostgreSQL database on port 5432
   - Start backend API on port 5000
   - Start frontend on port 3000
   - Automatically run database migrations
   - Automatically load seed data

3. **Verify services are running**
   ```bash
   docker-compose ps
   ```

4. **Check health**
   ```bash
   curl http://localhost:5000/api/health
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

### Local Development Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=saas_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_for_security
   JWT_EXPIRES_IN=24h
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start PostgreSQL database** (if not using Docker)
   ```bash
   # Make sure PostgreSQL is running locally
   ```

5. **Run migrations**
   ```bash
   npm run migrate
   ```

6. **Seed database**
   ```bash
   npm run seed
   ```

7. **Start backend server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `saas_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - |
| `JWT_EXPIRES_IN` | JWT token expiry | `24h` |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` |

## Test Credentials

Seed data is automatically loaded when starting with Docker. Test credentials are available in `submission.json`:

### Super Admin
- Email: `superadmin@system.com`
- Password: `Admin@123`

### Demo Tenant
- Subdomain: `demo`
- Tenant Admin:
  - Email: `admin@demo.com`
  - Password: `Demo@123`
- Regular Users:
  - Email: `user1@demo.com` / Password: `User@123`
  - Email: `user2@demo.com` / Password: `User@123`

## API Documentation

Complete API documentation is available in `docs/API.md`. The API includes 19 endpoints covering:

- Authentication (4 endpoints): Registration, Login, Get Current User, Logout
- Tenant Management (3 endpoints): Get Tenant, Update Tenant, List All Tenants
- User Management (4 endpoints): Add User, List Users, Update User, Delete User
- Project Management (4 endpoints): Create, List, Update, Delete
- Task Management (4 endpoints): Create, List, Update Status, Update

All endpoints return consistent JSON responses:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## Project Structure

```
sMultitennant/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── tenantIsolation.js
│   ├── migrations/
│   │   ├── 001_create_tenants.sql
│   │   ├── 002_create_users.sql
│   │   ├── 003_create_projects.sql
│   │   ├── 004_create_tasks.sql
│   │   └── 005_create_audit_logs.sql
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tenants.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   └── tasks.js
│   ├── scripts/
│   │   ├── runMigrations.js
│   │   └── seedDatabase.js
│   ├── utils/
│   │   ├── auditLogger.js
│   │   └── validators.js
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Register.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── ProjectDetails.jsx
│   │   │   └── Users.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── docs/
│   ├── research.md
│   ├── PRD.md
│   ├── architecture.md
│   ├── technical-spec.md
│   └── API.md
├── docker-compose.yml
├── submission.json
└── README.md
```

## Database Schema

The database consists of 5 core tables:

1. **tenants**: Organization information with subscription plans
2. **users**: User accounts with tenant association (except super_admin)
3. **projects**: Projects belonging to tenants
4. **tasks**: Tasks within projects
5. **audit_logs**: Audit trail for all important actions

See `docs/architecture.md` for detailed ERD and schema documentation.

## Security Features

- **Password Hashing**: bcrypt with salt rounds 10
- **JWT Authentication**: Secure token-based authentication
- **Data Isolation**: Automatic tenant filtering on all queries
- **Role-Based Authorization**: Endpoint-level permission checks
- **Input Validation**: Server-side validation using express-validator
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configurable CORS for frontend domain
- **Audit Logging**: Comprehensive logging of all critical operations

## Subscription Plans

| Plan | Max Users | Max Projects |
|------|-----------|--------------|
| Free | 5 | 3 |
| Pro | 25 | 15 |
| Enterprise | 100 | 50 |

New tenants are automatically assigned the Free plan. Limits are enforced at the API level before resource creation.

## Docker Services

The application consists of three Docker services:

1. **database**: PostgreSQL 15 on port 5432
2. **backend**: Node.js Express API on port 5000
3. **frontend**: React application on port 3000

All services start automatically with `docker-compose up -d` and are configured with health checks and dependencies.

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running and accessible
- Check environment variables match database configuration
- Verify database credentials in `.env` or `docker-compose.yml`

### Port conflicts
- Check if ports 3000, 5000, or 5432 are already in use
- Modify port mappings in `docker-compose.yml` if needed

### Migration errors
- Check database logs: `docker-compose logs database`
- Ensure migrations directory exists with SQL files
- Verify database user has CREATE TABLE permissions

### Frontend API errors
- Verify `VITE_API_URL` is set correctly
- Check backend is running and accessible
- Verify CORS is configured correctly in backend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is created for educational purposes.

## Demo Video

[Link to YouTube demo video - to be added]

## Additional Documentation

- **Research Document**: `docs/research.md` - Multi-tenancy analysis and technology stack justification
- **Product Requirements**: `docs/PRD.md` - User personas and functional requirements
- **Architecture**: `docs/architecture.md` - System architecture and database ERD
- **Technical Spec**: `docs/technical-spec.md` - Development setup and project structure
- **API Documentation**: `docs/API.md` - Complete API endpoint documentation

# multitenant-fsd
