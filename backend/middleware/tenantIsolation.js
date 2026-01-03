// Middleware to automatically filter queries by tenant_id
// Applied to routes that need tenant isolation
const tenantIsolation = (req, res, next) => {
  const user = req.user;

  // Super admin bypasses tenant isolation
  if (user.role === 'super_admin') {
    req.tenantFilter = null;
    return next();
  }

  // Add tenant_id filter for other users
  req.tenantFilter = user.tenantId;
  next();
};

module.exports = tenantIsolation;


