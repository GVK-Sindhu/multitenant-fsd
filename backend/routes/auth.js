const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateTenantRegistration, validateLogin } = require('../utils/validators');
const { logAction } = require('../utils/auditLogger');

// Register tenant
router.post('/register-tenant', validateTenantRegistration, async (req, res) => {
  const client = await require('../config/database').pool.connect();
  
  try {
    await client.query('BEGIN');

    const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;

    // Check if subdomain exists
    const subdomainCheck = await client.query(
      'SELECT id FROM tenants WHERE subdomain = $1',
      [subdomain.toLowerCase()]
    );

    if (subdomainCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    // Check if email exists in any tenant
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Set subscription limits based on free plan
    const maxUsers = 5;
    const maxProjects = 3;

    // Create tenant
    const tenantId = uuidv4();
    await client.query(
      `INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [tenantId, tenantName, subdomain.toLowerCase(), 'active', 'free', maxUsers, maxProjects]
    );

    // Create admin user
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [userId, tenantId, adminEmail.toLowerCase(), passwordHash, adminFullName, 'tenant_admin', true]
    );

    await client.query('COMMIT');

    // Log action
    await logAction(tenantId, userId, 'CREATE_TENANT', 'tenant', tenantId, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tenant registered successfully',
      data: {
        tenantId,
        subdomain: subdomain.toLowerCase(),
        adminUser: {
          id: userId,
          email: adminEmail.toLowerCase(),
          fullName: adminFullName,
          role: 'tenant_admin'
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  } finally {
    client.release();
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password, tenantSubdomain, tenantId } = req.body;

    // Find tenant by subdomain or tenantId
    let tenant;
    if (tenantSubdomain) {
      const tenantResult = await query(
        'SELECT * FROM tenants WHERE subdomain = $1',
        [tenantSubdomain.toLowerCase()]
      );
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }
      tenant = tenantResult.rows[0];
    } else if (tenantId) {
      const tenantResult = await query(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }
      tenant = tenantResult.rows[0];
    } else {
      return res.status(400).json({
        success: false,
        message: 'tenantSubdomain or tenantId is required'
      });
    }

    // Check tenant status
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tenant account is suspended'
      });
    }

    // Find user (for super_admin, tenant_id is null)
    const userResult = await query(
      'SELECT * FROM users WHERE email = $1 AND (tenant_id = $2 OR (tenant_id IS NULL AND role = $3))',
      [email.toLowerCase(), tenant.id, 'super_admin']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // For super_admin, allow login without tenant check
    if (user.role !== 'super_admin' && user.tenant_id !== tenant.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    // Log login
    await logAction(user.tenant_id || tenant.id, user.id, 'LOGIN', 'user', user.id, req.ip);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id
        },
        token,
        expiresIn: 86400 // 24 hours in seconds
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // Get user info
    const userResult = await query(
      'SELECT id, email, full_name, role, is_active, tenant_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get tenant info if user belongs to a tenant
    let tenant = null;
    if (tenantId) {
      const tenantResult = await query(
        'SELECT id, name, subdomain, status, subscription_plan, max_users, max_projects FROM tenants WHERE id = $1',
        [tenantId]
      );
      if (tenantResult.rows.length > 0) {
        tenant = tenantResult.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          subscriptionPlan: tenant.subscription_plan,
          maxUsers: tenant.max_users,
          maxProjects: tenant.max_projects
        } : null
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await logAction(req.user.tenantId, req.user.userId, 'LOGOUT', 'user', req.user.userId, req.ip);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;


