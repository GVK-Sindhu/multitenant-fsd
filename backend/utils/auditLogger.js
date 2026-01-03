const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const logAction = async (tenantId, userId, action, entityType, entityId, ipAddress = null) => {
  try {
    await query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [uuidv4(), tenantId, userId, action, entityType, entityId, ipAddress]
    );
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { logAction };


