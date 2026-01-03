const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { validateTask } = require('../utils/validators');
const { logAction } = require('../utils/auditLogger');

// Create task
router.post('/projects/:projectId/tasks', authenticate, tenantIsolation, validateTask, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignedTo, priority = 'medium', dueDate } = req.body;
    const user = req.user;

    // Get project and verify it belongs to user's tenant
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
        message: 'Forbidden: Access denied to this project'
      });
    }

    // If assignedTo is provided, verify user belongs to same tenant
    if (assignedTo) {
      const assigneeResult = await query(
        'SELECT tenant_id FROM users WHERE id = $1',
        [assignedTo]
      );

      if (assigneeResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user not found'
        });
      }

      if (assigneeResult.rows[0].tenant_id !== project.tenant_id) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must belong to the same tenant'
        });
      }
    }

    // Create task
    const taskId = uuidv4();
    await query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [taskId, projectId, project.tenant_id, title, description || null, 'todo', priority, assignedTo || null, dueDate || null]
    );

    // Log action
    await logAction(project.tenant_id, user.userId, 'CREATE_TASK', 'task', taskId, req.ip);

    res.status(201).json({
      success: true,
      data: {
        id: taskId,
        projectId,
        tenantId: project.tenant_id,
        title,
        description,
        status: 'todo',
        priority,
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

// List project tasks
router.get('/projects/:projectId/tasks', authenticate, tenantIsolation, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignedTo, priority, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;
    const user = req.user;

    // Verify project belongs to user's tenant
    const projectResult = await query(
      'SELECT tenant_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const project = projectResult.rows[0];

    if (user.role !== 'super_admin' && project.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Build query
    let whereClause = 'WHERE t.project_id = $1';
    const queryParams = [projectId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND t.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (assignedTo) {
      whereClause += ` AND t.assigned_to = $${paramIndex++}`;
      queryParams.push(assignedTo);
    }

    if (priority) {
      whereClause += ` AND t.priority = $${paramIndex++}`;
      queryParams.push(priority);
    }

    if (search) {
      whereClause += ` AND LOWER(t.title) LIKE LOWER($${paramIndex++})`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM tasks t ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get tasks with assignee info
    queryParams.push(limit, offset);
    const tasksResult = await query(
      `SELECT t.*, 
              u.id as assignee_id,
              u.full_name as assignee_name,
              u.email as assignee_email
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       ${whereClause}
       ORDER BY 
         CASE t.priority 
           WHEN 'high' THEN 1 
           WHEN 'medium' THEN 2 
           WHEN 'low' THEN 3 
         END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    const tasks = tasksResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to ? {
        id: row.assignee_id,
        fullName: row.assignee_name,
        email: row.assignee_email
      } : null,
      dueDate: row.due_date,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: {
        tasks,
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list tasks'
    });
  }
});

// Update task status
router.patch('/:taskId/status', authenticate, tenantIsolation, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const user = req.user;

    if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (todo, in_progress, completed)'
      });
    }

    // Get task
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = taskResult.rows[0];

    // Verify task belongs to user's tenant
    if (user.role !== 'super_admin' && task.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // Update status
    await query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, taskId]
    );

    res.json({
      success: true,
      data: {
        id: taskId,
        status,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status'
    });
  }
});

// Update task
router.put('/:taskId', authenticate, tenantIsolation, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;
    const user = req.user;

    // Get task
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = taskResult.rows[0];

    // Verify task belongs to user's tenant
    if (user.role !== 'super_admin' && task.tenant_id !== user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied'
      });
    }

    // If assignedTo is provided, verify user belongs to same tenant
    if (assignedTo !== undefined && assignedTo !== null) {
      const assigneeResult = await query(
        'SELECT tenant_id FROM users WHERE id = $1',
        [assignedTo]
      );

      if (assigneeResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user not found'
        });
      }

      if (assigneeResult.rows[0].tenant_id !== task.tenant_id) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must belong to the same tenant'
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(assignedTo);
    }
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(dueDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(taskId);

    await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Get updated task with assignee info
    const updatedTaskResult = await query(
      `SELECT t.*, 
              u.id as assignee_id,
              u.full_name as assignee_name,
              u.email as assignee_email
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    const updatedTask = updatedTaskResult.rows[0];

    // Log action
    await logAction(task.tenant_id, user.userId, 'UPDATE_TASK', 'task', taskId, req.ip);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        assignedTo: updatedTask.assigned_to ? {
          id: updatedTask.assignee_id,
          fullName: updatedTask.assignee_name,
          email: updatedTask.assignee_email
        } : null,
        dueDate: updatedTask.due_date,
        updatedAt: updatedTask.updated_at
      }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

module.exports = router;

