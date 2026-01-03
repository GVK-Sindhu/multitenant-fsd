const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Check if data already exists
    const existingTenant = await query('SELECT id FROM tenants WHERE subdomain = $1', ['demo']);
    if (existingTenant.rows.length > 0) {
      console.log('Seed data already exists, skipping...');
      return;
    }

    // Create super admin
    const superAdminId = uuidv4();
    const superAdminPasswordHash = await bcrypt.hash('Admin@123', 10);
    
    await query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [superAdminId, 'superadmin@system.com', superAdminPasswordHash, 'Super Admin', 'super_admin', true]
    );
    console.log('✓ Created super admin');

    // Create demo tenant
    const demoTenantId = uuidv4();
    await query(
      `INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [demoTenantId, 'Demo Company', 'demo', 'active', 'pro', 25, 15]
    );
    console.log('✓ Created demo tenant');

    // Create tenant admin for demo
    const tenantAdminId = uuidv4();
    const tenantAdminPasswordHash = await bcrypt.hash('Demo@123', 10);
    
    await query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [tenantAdminId, demoTenantId, 'admin@demo.com', tenantAdminPasswordHash, 'Demo Admin', 'tenant_admin', true]
    );
    console.log('✓ Created tenant admin');

    // Create regular users for demo
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const userPasswordHash = await bcrypt.hash('User@123', 10);

    await query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [user1Id, demoTenantId, 'user1@demo.com', userPasswordHash, 'User One', 'user', true]
    );

    await query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [user2Id, demoTenantId, 'user2@demo.com', userPasswordHash, 'User Two', 'user', true]
    );
    console.log('✓ Created regular users');

    // Create projects
    const project1Id = uuidv4();
    const project2Id = uuidv4();

    await query(
      `INSERT INTO projects (id, tenant_id, name, description, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [project1Id, demoTenantId, 'Project Alpha', 'First demo project', 'active', tenantAdminId]
    );

    await query(
      `INSERT INTO projects (id, tenant_id, name, description, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [project2Id, demoTenantId, 'Project Beta', 'Second demo project', 'active', tenantAdminId]
    );
    console.log('✓ Created projects');

    // Create tasks
    const task1Id = uuidv4();
    const task2Id = uuidv4();
    const task3Id = uuidv4();
    const task4Id = uuidv4();
    const task5Id = uuidv4();

    await query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [task1Id, project1Id, demoTenantId, 'Design homepage mockup', 'Create high-fidelity design', 'todo', 'high', user1Id, '2024-12-31']
    );

    await query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [task2Id, project1Id, demoTenantId, 'Implement authentication', 'Set up JWT authentication', 'in_progress', 'high', user1Id, '2024-12-25']
    );

    await query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [task3Id, project1Id, demoTenantId, 'Write unit tests', 'Cover all API endpoints', 'todo', 'medium', user2Id, '2024-12-28']
    );

    await query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [task4Id, project2Id, demoTenantId, 'Setup CI/CD pipeline', 'Configure deployment automation', 'completed', 'high', user2Id, '2024-12-20']
    );

    await query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [task5Id, project2Id, demoTenantId, 'Document API endpoints', 'Create comprehensive API documentation', 'todo', 'low', null, '2025-01-05']
    );
    console.log('✓ Created tasks');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Wait for database to be ready
const waitForDatabase = async () => {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await query('SELECT NOW()');
      console.log('Database connection established for seeding');
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.log(`Waiting for database... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  throw new Error('Database connection timeout');
};

waitForDatabase()
  .then(() => seedDatabase())
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

