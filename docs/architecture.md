# System Architecture Documentation

## High-Level System Architecture

The Multi-Tenant SaaS Platform follows a three-tier architecture:

```
┌─────────────────┐
│   Web Browser   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/HTTPS
         │ REST API
         │ JWT Token
         ▼
┌─────────────────────────┐
│   Backend API Server    │
│   (Express.js)          │
│                         │
│  - Authentication       │
│  - Authorization        │
│  - Business Logic       │
│  - Data Validation      │
└────────┬────────────────┘
         │ SQL Queries
         │ (Filtered by tenant_id)
         ▼
┌─────────────────────────┐
│   PostgreSQL Database   │
│                         │
│  - Tenants              │
│  - Users                │
│  - Projects             │
│  - Tasks                │
│  - Audit Logs           │
└─────────────────────────┘
```

### Component Description

**Frontend Layer:**
- React SPA with client-side routing
- JWT token stored in localStorage
- Axios for API communication
- Role-based UI rendering

**Backend API Layer:**
- Express.js REST API
- JWT authentication middleware
- Tenant isolation middleware
- Role-based authorization
- Input validation
- Audit logging

**Data Layer:**
- PostgreSQL relational database
- Shared schema with tenant_id columns
- Foreign key constraints
- Indexes on tenant_id for performance

## Database Schema Design

### Entity Relationship Diagram (ERD)

```
┌─────────────┐         ┌─────────────┐
│   tenants   │◄────────│    users    │
│             │         │             │
│ - id (PK)   │         │ - id (PK)   │
│ - name      │         │ - tenant_id │
│ - subdomain │         │   (FK)      │
│ - status    │         │ - email     │
│ - plan      │         │ - role      │
│ - max_users │         │ - password  │
│ - max_proj  │         └──────┬──────┘
└──────┬──────┘                │
       │                       │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│  projects   │         │ audit_logs  │
│             │         │             │
│ - id (PK)   │         │ - id (PK)   │
│ - tenant_id │         │ - tenant_id │
│   (FK)      │         │   (FK)      │
│ - name      │         │ - user_id   │
│ - status    │         │   (FK)      │
│ - created_by│         │ - action    │
│   (FK)      │         │ - entity    │
└──────┬──────┘         └─────────────┘
       │
       │
       ▼
┌─────────────┐
│    tasks    │
│             │
│ - id (PK)   │
│ - project_id│
│   (FK)      │
│ - tenant_id │
│   (FK)      │
│ - title     │
│ - status    │
│ - priority  │
│ - assigned_to│
│   (FK)      │
│ - due_date  │
└─────────────┘
```

### Table Descriptions

#### tenants
Stores organization/tenant information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PRIMARY KEY | Unique tenant identifier |
| name | VARCHAR(255) | NOT NULL | Organization name |
| subdomain | VARCHAR(255) | UNIQUE, NOT NULL | Tenant subdomain (unique) |
| status | VARCHAR(50) | NOT NULL, CHECK | 'active', 'suspended', 'trial' |
| subscription_plan | VARCHAR(50) | NOT NULL, CHECK | 'free', 'pro', 'enterprise' |
| max_users | INTEGER | NOT NULL | Maximum users allowed |
| max_projects | INTEGER | NOT NULL | Maximum projects allowed |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:** subdomain, status

#### users
Stores user accounts with tenant association.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PRIMARY KEY | Unique user identifier |
| tenant_id | VARCHAR(255) | FK → tenants.id, NULL | Tenant ID (NULL for super_admin) |
| email | VARCHAR(255) | NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| full_name | VARCHAR(255) | NOT NULL | User's full name |
| role | VARCHAR(50) | NOT NULL, CHECK | 'super_admin', 'tenant_admin', 'user' |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Unique Constraint:** (tenant_id, email) - Email unique per tenant
**Indexes:** tenant_id, email, role

#### projects
Stores projects within tenants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PRIMARY KEY | Unique project identifier |
| tenant_id | VARCHAR(255) | FK → tenants.id, NOT NULL | Tenant ID |
| name | VARCHAR(255) | NOT NULL | Project name |
| description | TEXT | | Project description |
| status | VARCHAR(50) | NOT NULL, CHECK | 'active', 'archived', 'completed' |
| created_by | VARCHAR(255) | FK → users.id, NOT NULL | Creator user ID |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:** tenant_id, created_by, status
**CASCADE DELETE:** Deleting tenant deletes all projects

#### tasks
Stores tasks within projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PRIMARY KEY | Unique task identifier |
| project_id | VARCHAR(255) | FK → projects.id, NOT NULL | Project ID |
| tenant_id | VARCHAR(255) | FK → tenants.id, NOT NULL | Tenant ID |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | TEXT | | Task description |
| status | VARCHAR(50) | NOT NULL, CHECK | 'todo', 'in_progress', 'completed' |
| priority | VARCHAR(50) | NOT NULL, CHECK | 'low', 'medium', 'high' |
| assigned_to | VARCHAR(255) | FK → users.id, NULL | Assigned user ID |
| due_date | DATE | | Task due date |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:** project_id, tenant_id, assigned_to, status, (tenant_id, project_id)
**CASCADE DELETE:** Deleting project deletes all tasks
**SET NULL:** Deleting user sets assigned_to to NULL

#### audit_logs
Stores audit trail of all important actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PRIMARY KEY | Unique log identifier |
| tenant_id | VARCHAR(255) | FK → tenants.id | Tenant ID |
| user_id | VARCHAR(255) | FK → users.id | User who performed action |
| action | VARCHAR(255) | NOT NULL | Action type (e.g., 'CREATE_USER') |
| entity_type | VARCHAR(255) | | Entity type (e.g., 'user', 'project') |
| entity_id | VARCHAR(255) | | Entity ID |
| ip_address | VARCHAR(255) | | IP address of request |
| created_at | TIMESTAMP | NOT NULL | Action timestamp |

**Indexes:** tenant_id, user_id, created_at

## API Architecture

### Authentication Flow

```
1. User submits login form (email, password, tenantSubdomain)
   ↓
2. Backend validates credentials
   ↓
3. Backend generates JWT token with {userId, tenantId, role}
   ↓
4. Frontend stores token in localStorage
   ↓
5. Frontend includes token in Authorization header for all requests
   ↓
6. Backend middleware validates token and extracts user info
   ↓
7. Tenant isolation middleware adds tenant_id filter to queries
```

### Request Flow

```
1. Client Request (with JWT token)
   ↓
2. Authentication Middleware (validate JWT, extract user info)
   ↓
3. Authorization Middleware (check role permissions)
   ↓
4. Tenant Isolation Middleware (add tenant_id filter)
   ↓
5. Route Handler (execute business logic)
   ↓
6. Database Query (with tenant_id filtering)
   ↓
7. Response (with success/error status)
```

### Complete API Endpoint List

#### Authentication Endpoints (4)

1. **POST /api/auth/register-tenant**
   - Public endpoint
   - Creates new tenant and admin user
   - Returns tenant and admin user details

2. **POST /api/auth/login**
   - Public endpoint
   - Validates credentials
   - Returns JWT token and user info

3. **GET /api/auth/me**
   - Requires authentication
   - Returns current user and tenant info

4. **POST /api/auth/logout**
   - Requires authentication
   - Logs logout action

#### Tenant Management Endpoints (3)

5. **GET /api/tenants/:tenantId**
   - Requires authentication
   - Returns tenant details with statistics
   - User must belong to tenant OR be super_admin

6. **PUT /api/tenants/:tenantId**
   - Requires authentication
   - Updates tenant (name for tenant_admin, all fields for super_admin)
   - Authorization: tenant_admin OR super_admin

7. **GET /api/tenants**
   - Requires authentication
   - Lists all tenants with pagination
   - Authorization: super_admin ONLY

#### User Management Endpoints (4)

8. **POST /api/users/tenants/:tenantId/users**
   - Requires authentication
   - Creates new user in tenant
   - Authorization: tenant_admin
   - Enforces user limit

9. **GET /api/users/tenants/:tenantId/users**
   - Requires authentication
   - Lists users in tenant with pagination and search
   - User must belong to tenant

10. **PUT /api/users/:userId**
    - Requires authentication
    - Updates user (limited fields for self, all for tenant_admin)
    - Authorization: self OR tenant_admin

11. **DELETE /api/users/:userId**
    - Requires authentication
    - Deletes user
    - Authorization: tenant_admin
    - Cannot delete self

#### Project Management Endpoints (4)

12. **POST /api/projects**
    - Requires authentication
    - Creates new project
    - Enforces project limit

13. **GET /api/projects**
    - Requires authentication
    - Lists projects with pagination and filtering
    - Automatic tenant filtering

14. **PUT /api/projects/:projectId**
    - Requires authentication
    - Updates project
    - Authorization: creator OR tenant_admin

15. **DELETE /api/projects/:projectId**
    - Requires authentication
    - Deletes project
    - Authorization: creator OR tenant_admin

#### Task Management Endpoints (4)

16. **POST /api/tasks/projects/:projectId/tasks**
    - Requires authentication
    - Creates new task in project
    - Validates assigned user belongs to same tenant

17. **GET /api/tasks/projects/:projectId/tasks**
    - Requires authentication
    - Lists tasks in project with filtering
    - Automatic tenant filtering

18. **PATCH /api/tasks/:taskId/status**
    - Requires authentication
    - Updates task status only
    - Any user in tenant can update

19. **PUT /api/tasks/:taskId**
    - Requires authentication
    - Updates task (all fields)
    - Validates assigned user belongs to same tenant

#### Health Check Endpoint

20. **GET /api/health**
    - Public endpoint
    - Returns system and database status

## Data Isolation Strategy

### Query Filtering Pattern

All queries automatically filter by tenant_id:

```javascript
// Example: List projects
const query = user.role === 'super_admin' 
  ? 'SELECT * FROM projects'
  : 'SELECT * FROM projects WHERE tenant_id = $1';
```

### Super Admin Exception

Super admin users have `tenant_id = NULL` and bypass tenant filtering:

```javascript
if (user.role === 'super_admin') {
  // No tenant filter - access all data
} else {
  // Filter by tenant_id
  WHERE tenant_id = user.tenantId
}
```

### Foreign Key Integrity

Foreign key constraints ensure data integrity:

- Users must belong to valid tenant (except super_admin)
- Projects must belong to valid tenant
- Tasks must belong to valid project and tenant
- Cascade deletes maintain referential integrity

## Security Architecture

### Authentication Layer
- JWT token validation
- Token expiry checking (24 hours)
- Token payload extraction (userId, tenantId, role)

### Authorization Layer
- Role-based access control
- Endpoint-level permission checks
- Resource-level ownership checks

### Data Isolation Layer
- Automatic tenant_id filtering
- No client-provided tenant_id accepted
- Tenant_id always from authenticated JWT

### Audit Layer
- All critical actions logged
- Includes tenant_id, user_id, action, entity
- Timestamp and IP address tracking

## Deployment Architecture

```
┌─────────────────────────────────────┐
│      Docker Compose Network         │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Frontend │  │ Backend  │        │
│  │ :3000    │──│ :5000    │        │
│  └──────────┘  └────┬─────┘        │
│                     │               │
│              ┌──────▼──────┐        │
│              │  Database   │        │
│              │   :5432     │        │
│              └─────────────┘        │
└─────────────────────────────────────┘
```

All services run in Docker containers with:
- Service discovery via container names
- Internal networking for communication
- Port mapping for external access
- Volume persistence for database data

