# API Documentation
## Multi-Tenant SaaS Platform

Base URL: `http://localhost:5000/api` (local) or `http://backend:5000/api` (Docker)

All API responses follow this format:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Tenant Registration

**POST** `/api/auth/register-tenant`

Create a new tenant organization with admin user.

**Request Body:**
```json
{
  "tenantName": "Acme Corporation",
  "subdomain": "acme",
  "adminEmail": "admin@acme.com",
  "adminPassword": "SecurePass123!",
  "adminFullName": "John Admin"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Tenant registered successfully",
  "data": {
    "tenantId": "uuid",
    "subdomain": "acme",
    "adminUser": {
      "id": "uuid",
      "email": "admin@acme.com",
      "fullName": "John Admin",
      "role": "tenant_admin"
    }
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `409`: Subdomain or email already exists

---

## 2. User Login

**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "admin@demo.com",
  "password": "Demo@123",
  "tenantSubdomain": "demo"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@demo.com",
      "fullName": "Demo Admin",
      "role": "tenant_admin",
      "tenantId": "uuid"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `403`: Account suspended/inactive
- `404`: Tenant not found

---

## 3. Get Current User

**GET** `/api/auth/me`

Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@demo.com",
    "fullName": "Demo Admin",
    "role": "tenant_admin",
    "isActive": true,
    "tenant": {
      "id": "uuid",
      "name": "Demo Company",
      "subdomain": "demo",
      "subscriptionPlan": "pro",
      "maxUsers": 25,
      "maxProjects": 15
    }
  }
}
```

**Error Responses:**
- `401`: Token invalid/expired
- `404`: User not found

---

## 4. Logout

**POST** `/api/auth/logout`

Logout current user (logs action to audit log).

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 5. Get Tenant Details

**GET** `/api/tenants/:tenantId`

Get tenant information with statistics.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** User must belong to tenant OR be super_admin

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Demo Company",
    "subdomain": "demo",
    "status": "active",
    "subscriptionPlan": "pro",
    "maxUsers": 25,
    "maxProjects": 15,
    "createdAt": "2024-01-01T00:00:00Z",
    "stats": {
      "totalUsers": 5,
      "totalProjects": 3,
      "totalTasks": 15
    }
  }
}
```

**Error Responses:**
- `403`: Access denied
- `404`: Tenant not found

---

## 6. Update Tenant

**PUT** `/api/tenants/:tenantId`

Update tenant information.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** tenant_admin (can update name only) OR super_admin (can update all fields)

**Request Body (tenant_admin):**
```json
{
  "name": "Updated Company Name"
}
```

**Request Body (super_admin):**
```json
{
  "name": "Updated Company Name",
  "status": "active",
  "subscriptionPlan": "enterprise",
  "maxUsers": 100,
  "maxProjects": 50
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": {
    "id": "uuid",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Insufficient permissions
- `404`: Tenant not found

---

## 7. List All Tenants

**GET** `/api/tenants`

List all tenants with pagination (super_admin only).

**Headers:** `Authorization: Bearer <token>`
**Authorization:** super_admin ONLY

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10, max: 100): Items per page
- `status` (string, optional): Filter by status (active, suspended, trial)
- `subscriptionPlan` (string, optional): Filter by plan (free, pro, enterprise)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "uuid",
        "name": "Demo Company",
        "subdomain": "demo",
        "status": "active",
        "subscriptionPlan": "pro",
        "totalUsers": 5,
        "totalProjects": 3,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalTenants": 47,
      "limit": 10
    }
  }
}
```

**Error Responses:**
- `403`: Not super_admin

---

## 8. Add User to Tenant

**POST** `/api/users/tenants/:tenantId/users`

Create a new user in the specified tenant.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** tenant_admin only

**Request Body:**
```json
{
  "email": "newuser@demo.com",
  "password": "UserPass123!",
  "fullName": "New User",
  "role": "user"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "email": "newuser@demo.com",
    "fullName": "New User",
    "role": "user",
    "tenantId": "uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Subscription limit reached OR not authorized
- `409`: Email already exists in this tenant

---

## 9. List Tenant Users

**GET** `/api/users/tenants/:tenantId/users`

List all users in the specified tenant.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** User must belong to tenant

**Query Parameters:**
- `search` (string, optional): Search by name or email
- `role` (string, optional): Filter by role (super_admin, tenant_admin, user)
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 50, max: 100): Items per page

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@demo.com",
        "fullName": "User Name",
        "role": "user",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    }
  }
}
```

**Error Responses:**
- `403`: Access denied

---

## 10. Update User

**PUT** `/api/users/:userId`

Update user information.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** Users can update their own name; tenant_admin can update all fields

**Request Body (self):**
```json
{
  "fullName": "Updated Name"
}
```

**Request Body (tenant_admin):**
```json
{
  "fullName": "Updated Name",
  "role": "tenant_admin",
  "isActive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Insufficient permissions
- `404`: User not found

---

## 11. Delete User

**DELETE** `/api/users/:userId`

Delete a user from the tenant.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** tenant_admin only (cannot delete self)

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `403`: Cannot delete self OR not authorized
- `404`: User not found

---

## 12. Create Project

**POST** `/api/projects`

Create a new project in the user's tenant.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Complete redesign of company website",
  "status": "active"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Website Redesign",
    "description": "Complete redesign of company website",
    "status": "active",
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Project limit reached

---

## 13. List Projects

**GET** `/api/projects`

List all projects in the user's tenant.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (string, optional): Filter by status (active, archived, completed)
- `search` (string, optional): Search by project name
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Website Redesign",
        "description": "Complete redesign",
        "status": "active",
        "createdBy": {
          "id": "uuid",
          "fullName": "John Doe"
        },
        "taskCount": 5,
        "completedTaskCount": 2,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 3,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 20
    }
  }
}
```

---

## 14. Update Project

**PUT** `/api/projects/:projectId`

Update project information.

**Headers:** `Authorization: Bearer <token>`
**Authorization:** project creator OR tenant_admin

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "archived"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "uuid",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Not authorized
- `404`: Project not found

---

## 15. Delete Project

**DELETE** `/api/projects/:projectId`

Delete a project (cascades to delete all tasks).

**Headers:** `Authorization: Bearer <token>`
**Authorization:** project creator OR tenant_admin

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses:**
- `403`: Not authorized
- `404`: Project not found

---

## 16. Create Task

**POST** `/api/tasks/projects/:projectId/tasks`

Create a new task in the specified project.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Design homepage mockup",
  "description": "Create high-fidelity design",
  "assignedTo": "user-uuid",
  "priority": "high",
  "dueDate": "2024-12-31"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "tenantId": "uuid",
    "title": "Design homepage mockup",
    "description": "Create high-fidelity design",
    "status": "todo",
    "priority": "high",
    "assignedTo": "user-uuid",
    "dueDate": "2024-12-31",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Assigned user doesn't belong to same tenant
- `403`: Project doesn't belong to user's tenant

---

## 17. List Project Tasks

**GET** `/api/tasks/projects/:projectId/tasks`

List all tasks in the specified project.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (string, optional): Filter by status (todo, in_progress, completed)
- `assignedTo` (uuid, optional): Filter by assigned user ID
- `priority` (string, optional): Filter by priority (low, medium, high)
- `search` (string, optional): Search by task title
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 50, max: 100): Items per page

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Design homepage mockup",
        "description": "Create high-fidelity design",
        "status": "in_progress",
        "priority": "high",
        "assignedTo": {
          "id": "uuid",
          "fullName": "John Doe",
          "email": "john@demo.com"
        },
        "dueDate": "2024-12-31",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    }
  }
}
```

**Error Responses:**
- `403`: Project doesn't belong to user's tenant
- `404`: Project not found

---

## 18. Update Task Status

**PATCH** `/api/tasks/:taskId/status`

Update only the task status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Invalid status value
- `403`: Task doesn't belong to user's tenant
- `404`: Task not found

---

## 19. Update Task

**PUT** `/api/tasks/:taskId`

Update task information (all fields).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "user-uuid",
  "dueDate": "2024-12-31"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": "uuid",
    "title": "Updated task title",
    "description": "Updated description",
    "status": "in_progress",
    "priority": "high",
    "assignedTo": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@demo.com"
    },
    "dueDate": "2024-12-31",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Assigned user doesn't belong to same tenant
- `403`: Task doesn't belong to user's tenant
- `404`: Task not found

---

## 20. Health Check

**GET** `/api/health`

Check system and database health status.

**Success Response (200):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "database": "disconnected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

## Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Validation errors include additional details:
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

