const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

const validateTenantRegistration = [
  body('tenantName').trim().notEmpty().withMessage('Tenant name is required'),
  body('subdomain')
    .trim()
    .notEmpty()
    .withMessage('Subdomain is required')
    .matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .withMessage('Subdomain must be alphanumeric with hyphens, 3-63 characters'),
  body('adminEmail').isEmail().withMessage('Valid email is required'),
  body('adminPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('adminFullName').trim().notEmpty().withMessage('Full name is required'),
  handleValidationErrors
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('tenantSubdomain').optional().trim(),
  body('tenantId').optional(),
  handleValidationErrors
];

const validateUser = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(['user', 'tenant_admin']).withMessage('Invalid role'),
  handleValidationErrors
];

const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional(),
  body('status').optional().isIn(['active', 'archived', 'completed']).withMessage('Invalid status'),
  handleValidationErrors
];

const validateTask = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').optional(),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('assignedTo').optional().isUUID().withMessage('Invalid user ID'),
  handleValidationErrors
];

module.exports = {
  validateTenantRegistration,
  validateLogin,
  validateUser,
  validateProject,
  validateTask,
  handleValidationErrors
};


