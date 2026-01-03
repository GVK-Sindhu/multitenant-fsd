const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, authorize, requireTenantAccess } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

// Get tenant details
router.get('/:tenantId', authenticate, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Get tenant
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

    const tenant = tenantResult.rows[0];

    // Get stats
    const userCountResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    const projectCountResult = await query(
      'SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1',
      [tenantId]
    );
    const taskCountResult = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1',
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        subscriptionPlan: tenant.subscription_plan,
        maxUsers: tenant.max_users,
        maxProjects: tenant.max_projects,
        createdAt: tenant.created_at,
        stats: {
          totalUsers: parseInt(userCountResult.rows[0].count),
          totalProjects: parseInt(projectCountResult.rows[0].count),
          totalTasks: parseInt(taskCountResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant details'
    });
  }
});

// Update tenant
router.put('/:tenantId', authenticate, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, status, subscriptionPlan, maxUsers, maxProjects } = req.body;
    const user = req.user;

    // Check if tenant exists
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

    // Check authorization
    const isSuperAdmin = user.role === 'super_admin';
    const isTenantAdmin = user.role === 'tenant_admin' && user.tenantId === tenantId;

    if (!isSuperAdmin && !isTenantAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions'
      });
    }

    // Tenant admins can only update name
    if (isTenantAdmin && (status || subscriptionPlan || maxUsers || maxProjects)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only super admin can update subscription settings'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (status !== undefined && isSuperAdmin) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (subscriptionPlan !== undefined && isSuperAdmin) {
      updates.push(`subscription_plan = $${paramIndex++}`);
      values.push(subscriptionPlan);
    }
    if (maxUsers !== undefined && isSuperAdmin) {
      updates.push(`max_users = $${paramIndex++}`);
      values.push(maxUsers);
    }
    if (maxProjects !== undefined && isSuperAdmin) {
      updates.push(`max_projects = $${paramIndex++}`);
      values.push(maxProjects);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(tenantId);

    await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Log action
    await logAction(tenantId, user.userId, 'UPDATE_TENANT', 'tenant', tenantId, req.ip);

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        id: tenantId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant'
    });
  }
});

// List all tenants (super admin only)
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const subscriptionPlan = req.query.subscriptionPlan;

    // Build query
    let whereClause = '';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` WHERE status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (subscriptionPlan) {
      whereClause += whereClause ? ` AND subscription_plan = $${paramIndex++}` : ` WHERE subscription_plan = $${paramIndex++}`;
      queryParams.push(subscriptionPlan);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM tenants${whereClause}`,
      queryParams
    );
    const totalTenants = parseInt(countResult.rows[0].count);

    // Get tenants with user and project counts
    queryParams.push(limit, offset);
    const tenantsResult = await query(
      `SELECT t.*, 
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as total_users,
              (SELECT COUNT(*) FROM projects WHERE tenant_id = t.id) as total_projects
       FROM tenants t
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    const tenants = tenantsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      subdomain: row.subdomain,
      status: row.status,
      subscriptionPlan: row.subscription_plan,
      totalUsers: parseInt(row.total_users),
      totalProjects: parseInt(row.total_projects),
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTenants / limit),
          totalTenants,
          limit
        }
      }
    });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list tenants'
    });
  }
});

module.exports = router;

