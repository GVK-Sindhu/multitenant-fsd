# Technical Specification
## Multi-Tenant SaaS Platform

## Project Structure

### Backend Structure

```
backend/
├── config/
│   └── database.js           # PostgreSQL connection pool configuration
├── middleware/
│   ├── auth.js               # JWT authentication and authorization middleware
│   └── tenantIsolation.js    # Automatic tenant_id filtering middleware
├── migrations/
│   ├── 001_create_tenants.sql
│   ├── 002_create_users.sql
│   ├── 003_create_projects.sql
│   ├── 004_create_tasks.sql
│   └── 005_create_audit_logs.sql
├── routes/
│   ├── auth.js               # Authentication routes (register, login, logout, me)
│   ├── tenants.js            # Tenant management routes
│   ├── users.js              # User management routes
│   ├── projects.js           # Project management routes
│   └── tasks.js              # Task management routes
├── scripts/
│   ├── runMigrations.js      # Database migration runner
│   └── seedDatabase.js       # Seed data loader
├── utils/
│   ├── auditLogger.js        # Audit logging utility
│   └── validators.js         # Input validation rules
├── .dockerignore
├── Dockerfile                # Backend container definition
├── package.json              # Node.js dependencies
└── server.js                 # Express.js application entry point
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx        # Navigation bar component
│   │   ├── Navbar.css
│   │   └── PrivateRoute.jsx  # Protected route wrapper
│   ├── contexts/
│   │   └── AuthContext.jsx   # Authentication state management
│   ├── pages/
│   │   ├── Register.jsx      # Tenant registration page
│   │   ├── Register.css
│   │   ├── Login.jsx         # Login page
│   │   ├── Login.css
│   │   ├── Dashboard.jsx     # Dashboard with statistics
│   │   ├── Dashboard.css
│   │   ├── Projects.jsx      # Projects list page
│   │   ├── Projects.css
│   │   ├── ProjectDetails.jsx # Project details with tasks
│   │   ├── ProjectDetails.css
│   │   ├── Users.jsx         # Users list page (admin only)
│   │   └── Users.css
│   ├── services/
│   │   └── api.js            # Axios API client configuration
│   ├── App.jsx               # Main application component
│   ├── App.css
│   ├── main.jsx              # React entry point
│   └── index.css             # Global styles
├── .dockerignore
├── Dockerfile                # Frontend container definition
├── index.html                # HTML template
├── package.json              # Node.js dependencies
└── vite.config.js            # Vite build configuration
```

### Root Structure

```
sMultitennant/
├── backend/                  # Backend API application
├── frontend/                 # Frontend React application
├── docs/                     # Documentation
│   ├── images/               # Architecture diagrams
│   ├── research.md
│   ├── PRD.md
│   ├── architecture.md
│   ├── technical-spec.md
│   └── API.md
├── docker-compose.yml        # Docker Compose configuration
├── submission.json           # Test credentials for evaluation
├── .gitignore
└── README.md                 # Project documentation
```

## Development Setup

### Prerequisites

#### Required Software

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`
   - Includes npm package manager

2. **PostgreSQL** (version 15 or higher)
   - Download from: https://www.postgresql.org/download/
   - Verify installation: `psql --version`
   - Ensure PostgreSQL service is running

3. **Docker & Docker Compose** (for containerized development)
   - Docker Desktop: https://www.docker.com/products/docker-desktop/
   - Verify installation: `docker --version` and `docker-compose --version`

4. **Git** (for version control)
   - Download from: https://git-scm.com/downloads
   - Verify installation: `git --version`

#### Recommended Tools

- **VS Code** or any code editor with JavaScript/React support
- **Postman** or similar tool for API testing
- **pgAdmin** or similar tool for database management

### Environment Variables Setup

#### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saas_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_for_security
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- `JWT_SECRET` must be at least 32 characters long for security
- Change `DB_PASSWORD` to match your PostgreSQL password
- `FRONTEND_URL` should match your frontend development server URL

#### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

**Note:** Vite requires environment variables to be prefixed with `VITE_` to be accessible in the frontend code.

### Local Development Setup (Without Docker)

#### Step 1: Database Setup

1. **Create PostgreSQL Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres

   # Create database
   CREATE DATABASE saas_db;

   # Exit psql
   \q
   ```

2. **Verify database creation**
   ```bash
   psql -U postgres -d saas_db -c "SELECT version();"
   ```

#### Step 2: Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run database migrations**
   ```bash
   npm run migrate
   ```
   This will create all required tables in the database.

4. **Seed database with test data**
   ```bash
   npm run seed
   ```
   This will create:
   - Super admin user
   - Demo tenant
   - Sample users, projects, and tasks

5. **Start backend server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # OR production mode
   npm start
   ```

   Backend should start on http://localhost:5000

6. **Verify backend is running**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"ok","database":"connected",...}`

#### Step 3: Frontend Setup

1. **Navigate to frontend directory** (in a new terminal)
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend should start on http://localhost:3000 (or another port if 3000 is busy)

4. **Verify frontend is accessible**
   Open browser to http://localhost:3000

### Docker Development Setup

#### Quick Start

1. **Ensure Docker is running**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Pull PostgreSQL image
   - Build backend and frontend images
   - Start all three services
   - Automatically run migrations
   - Automatically load seed data

3. **Check service status**
   ```bash
   docker-compose ps
   ```

4. **View logs**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f database
   ```

5. **Stop services**
   ```bash
   docker-compose down
   ```

6. **Stop and remove volumes** (clears database data)
   ```bash
   docker-compose down -v
   ```

#### Rebuilding Services

After code changes:

```bash
# Rebuild and restart all services
docker-compose up -d --build

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

## Running Tests

### Manual API Testing

1. **Using curl**
   ```bash
   # Health check
   curl http://localhost:5000/api/health

   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.com","password":"Demo@123","tenantSubdomain":"demo"}'
   ```

2. **Using Postman**
   - Import API collection (if available)
   - Set base URL: http://localhost:5000/api
   - Test endpoints with proper authentication headers

### Database Testing

1. **Connect to database**
   ```bash
   # Local
   psql -U postgres -d saas_db

   # Docker
   docker exec -it database psql -U postgres -d saas_db
   ```

2. **Query data**
   ```sql
   -- List tenants
   SELECT * FROM tenants;

   -- List users
   SELECT id, email, full_name, role, tenant_id FROM users;

   -- List projects
   SELECT * FROM projects;

   -- List tasks
   SELECT * FROM tasks;
   ```

## Development Workflow

### Making Code Changes

1. **Backend Changes**
   - Edit files in `backend/` directory
   - If using `npm run dev`, server auto-reloads
   - If using Docker, rebuild container: `docker-compose build backend && docker-compose up -d backend`

2. **Frontend Changes**
   - Edit files in `frontend/src/` directory
   - Vite automatically hot-reloads on save
   - If using Docker, rebuild container: `docker-compose build frontend && docker-compose up -d frontend`

3. **Database Changes**
   - Create new migration file in `backend/migrations/`
   - Run migration: `npm run migrate` (local) or restart Docker container
   - Update seed data in `backend/scripts/seedDatabase.js` if needed

### Debugging

1. **Backend Debugging**
   - Check console logs in terminal
   - Check Docker logs: `docker-compose logs backend`
   - Add console.log statements for debugging
   - Use Node.js debugger if needed

2. **Frontend Debugging**
   - Open browser DevTools (F12)
   - Check Console for errors
   - Check Network tab for API calls
   - Use React DevTools browser extension

3. **Database Debugging**
   - Connect to database directly
   - Check table contents
   - Verify indexes exist
   - Check foreign key constraints

## Build and Deployment

### Building for Production

#### Backend

```bash
cd backend
npm install --production
# Code is already ready (no build step for Node.js)
```

#### Frontend

```bash
cd frontend
npm install
npm run build
# Production build in dist/ directory
```

### Docker Build Process

1. **Backend Dockerfile**
   - Uses Node.js 18 Alpine image
   - Installs dependencies
   - Copies application code
   - Runs migrations, seeds, then starts server

2. **Frontend Dockerfile**
   - Uses Node.js 18 Alpine image
   - Installs dependencies
   - Builds production bundle
   - Serves with Vite preview server

3. **Build commands**
   ```bash
   # Build all images
   docker-compose build

   # Build specific service
   docker-compose build backend
   ```

## Common Issues and Solutions

### Issue: Database Connection Error

**Solution:**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database `saas_db` exists
- Check firewall settings

### Issue: Port Already in Use

**Solution:**
- Check what's using the port: `netstat -ano | findstr :5000` (Windows)
- Stop conflicting service or change port in `.env`/`docker-compose.yml`

### Issue: Migration Errors

**Solution:**
- Ensure database is accessible
- Check migration SQL syntax
- Verify user has CREATE TABLE permissions
- Check for existing tables (may need to drop first)

### Issue: CORS Errors

**Solution:**
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS middleware is configured correctly
- Ensure frontend is calling correct API URL

### Issue: JWT Token Invalid

**Solution:**
- Check token hasn't expired (24 hours)
- Verify `JWT_SECRET` matches in all environments
- Ensure token is sent in Authorization header: `Bearer <token>`

## Performance Optimization

### Database Optimization

1. **Indexes**: Already created on tenant_id, foreign keys, and commonly queried columns
2. **Connection Pooling**: PostgreSQL connection pool configured in database.js
3. **Query Optimization**: Use EXPLAIN ANALYZE to identify slow queries

### Application Optimization

1. **Pagination**: All list endpoints support pagination to limit result sets
2. **Selective Fields**: Only fetch required fields from database
3. **Caching**: Consider adding Redis for caching in production

## Security Best Practices

1. **Never commit `.env` files** (already in .gitignore)
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Hash all passwords** (bcrypt with 10+ rounds)
4. **Validate all inputs** (server-side validation)
5. **Use parameterized queries** (prevent SQL injection)
6. **Implement rate limiting** (for production)
7. **Use HTTPS** (in production)
8. **Regular security audits** (dependency updates)

## Additional Resources

- Express.js Documentation: https://expressjs.com/
- React Documentation: https://react.dev/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Docker Documentation: https://docs.docker.com/
- JWT Best Practices: https://jwt.io/introduction

