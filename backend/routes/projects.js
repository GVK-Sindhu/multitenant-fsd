const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { validateProject } = require('../utils/validators');
const { logAction } = require('../utils/auditLogger');

// Create project
router.post('/', authenticate, tenantIsolation, validateProject, async (req, res) => {
  try {
    const { name, description, status = 'active' } = req.body;
    const user = req.user;
    const tenantId = user.tenantId;

    // Get tenant to check limits
    const tenantResult = await query(
      'SELECT max_projects FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check project limit
    const projectCountResult = await query(
      'SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1',
      [tenantId]
    );
    const currentCount = parseInt(projectCountResult.rows[0].count);
    const maxProjects = tenantResult.rows[0].max_projects;

    if (currentCount >= maxProjects) {
      return res.status(403).json({
        success: false,
        message: 'Subscription limit reached: Maximum projects exceeded'
      });
    }

    // Create project
    const projectId = uuidv4();
    await query(
      `INSERT INTO projects (id, tenant_id, name, description, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [projectId, tenantId, name, description || null, status, user.userId]
    );

    // Log action
    await logAction(tenantId, user.userId, 'CREATE_PROJECT', 'project', projectId, req.ip);

    res.status(201).json({
      success: true,
      data: {
        id: projectId,
        tenantId,
        name,
        description,
        status,
        createdBy: user.userId,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

// List projects
router.get('/', authenticate, tenantIsolation, async (req, res) => {
  try {
    const user = req.user;
    const status = req.query.status;
    const search = req.query.search;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Build query
    let whereClause = user.role === 'super_admin' ? '' : 'WHERE p.tenant_id = $1';
    const queryParams = [];
    let paramIndex = 1;

    if (user.role !== 'super_admin') {
      queryParams.push(user.tenantId);
    }

    if (status) {
      whereClause += whereClause ? ` AND p.status = $${paramIndex++}` : `WHERE p.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (search) {
      whereClause += whereClause ? ` AND LOWER(p.name) LIKE LOWER($${paramIndex++})` : `WHERE LOWER(p.name) LIKE LOWER($${paramIndex++})`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM projects p ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get projects with creator info and task counts
    queryParams.push(limit, offset);
    const projectsResult = await query(
      `SELECT p.*, 
              u.full_name as creator_name,
              u.id as creator_id,
              (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
              (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    const projects = projectsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdBy: {
        id: row.creator_id,
        fullName: row.creator_name
      },
      taskCount: parseInt(row.task_count),
      completedTaskCount: parseInt(row.completed_task_count),
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: {
        projects,
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list projects'
    });
  }
});

// Update project
router.put('/:projectId', authenticate, tenantIsolation, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body;
    const user = req.user;

    // Get project
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const project = projectResult.rows[0];

    // Verify project belongs to user's tenant
    if (user.role !== 'super_admin' && project.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Check authorization: tenant_admin or project creator
    const isTenantAdmin = user.role === 'tenant_admin' && project.tenant_id === user.tenantId;
    const isCreator = project.created_by === user.userId;

    if (!isTenantAdmin && !isCreator && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only project creator or tenant admin can update'
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
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(projectId);

    await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Log action
    await logAction(project.tenant_id, user.userId, 'UPDATE_PROJECT', 'project', projectId, req.ip);

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: {
        id: projectId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

// Delete project
router.delete('/:projectId', authenticate, tenantIsolation, async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;

    // Get project
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const project = projectResult.rows[0];

    // Verify project belongs to user's tenant
    if (user.role !== 'super_admin' && project.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Check authorization: tenant_admin or project creator
    const isTenantAdmin = user.role === 'tenant_admin' && project.tenant_id === user.tenantId;
    const isCreator = project.created_by === user.userId;

    if (!isTenantAdmin && !isCreator && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only project creator or tenant admin can delete'
      });
    }

    // Delete project (cascade will delete tasks)
    await query('DELETE FROM projects WHERE id = $1', [projectId]);

    // Log action
    await logAction(project.tenant_id, user.userId, 'DELETE_PROJECT', 'project', projectId, req.ip);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
});

module.exports = router;

