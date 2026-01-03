const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUser } = require('../utils/validators');
const { logAction } = require('../utils/auditLogger');

// Add user to tenant
router.post('/tenants/:tenantId/users', authenticate, authorize('tenant_admin'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { email, password, fullName, role = 'user' } = req.body;
    const user = req.user;

    // Verify tenant belongs to current user
    if (user.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Get tenant to check limits
    const tenantResult = await query(
      'SELECT max_users FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check user limit
    const userCountResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    const currentCount = parseInt(userCountResult.rows[0].count);
    const maxUsers = tenantResult.rows[0].max_users;

    if (currentCount >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: 'Subscription limit reached: Maximum users exceeded'
      });
    }

    // Check if email already exists in this tenant
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email.toLowerCase(), tenantId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists in this tenant'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [userId, tenantId, email.toLowerCase(), passwordHash, fullName, role, true]
    );

    // Log action
    await logAction(tenantId, user.userId, 'CREATE_USER', 'user', userId, req.ip);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: userId,
        email: email.toLowerCase(),
        fullName,
        role,
        tenantId,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// List tenant users
router.get('/tenants/:tenantId/users', authenticate, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const user = req.user;
    const search = req.query.search;
    const role = req.query.role;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    // Verify access
    if (user.role !== 'super_admin' && user.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Build query
    let whereClause = 'WHERE tenant_id = $1';
    const queryParams = [tenantId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (LOWER(full_name) LIKE LOWER($${paramIndex}) OR LOWER(email) LIKE LOWER($${paramIndex}))`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND role = $${paramIndex++}`;
      queryParams.push(role);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get users
    queryParams.push(limit, offset);
    const usersResult = await query(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    const users = usersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: {
        users,
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list users'
    });
  }
});

// Update user
router.put('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, role, isActive } = req.body;
    const user = req.user;

    // Get user to update
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userToUpdate = userResult.rows[0];

    // Verify access
    const isSuperAdmin = user.role === 'super_admin';
    const isTenantAdmin = user.role === 'tenant_admin' && user.tenantId === userToUpdate.tenant_id;
    const isSelf = user.userId === userId;

    if (!isSuperAdmin && !isTenantAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Regular users can only update their own fullName
    if (!isSuperAdmin && !isTenantAdmin) {
      if (role !== undefined || isActive !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only admins can update role and status'
        });
      }
    }

    // Tenant admins can update role and isActive, but only for their tenant
    if (isTenantAdmin && userToUpdate.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot update users from other tenants'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }

    if (role !== undefined && (isSuperAdmin || isTenantAdmin)) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (isActive !== undefined && (isSuperAdmin || isTenantAdmin)) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Log action
    await logAction(userToUpdate.tenant_id, user.userId, 'UPDATE_USER', 'user', userId, req.ip);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: userId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user
router.delete('/:userId', authenticate, authorize('tenant_admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.user;

    // Cannot delete self
    if (user.userId === userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete yourself'
      });
    }

    // Get user to delete
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userToDelete = userResult.rows[0];

    // Verify user belongs to same tenant
    if (user.tenantId !== userToDelete.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot delete users from other tenants'
      });
    }

    // Set assigned_to to NULL for tasks
    await query(
      'UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1',
      [userId]
    );

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [userId]);

    // Log action
    await logAction(userToDelete.tenant_id, user.userId, 'DELETE_USER', 'user', userId, req.ip);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;

