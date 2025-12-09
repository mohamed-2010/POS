-- Test data with UUID-based IDs (compatible with schema)
-- Password: admin123

-- Clean up
DELETE FROM users WHERE username = 'admin';
DELETE FROM roles WHERE name = 'admin' AND client_id IN (SELECT id FROM clients WHERE email = 'admin@testpos.com');
DELETE FROM branches WHERE name = 'Main Branch' AND client_id IN (SELECT id FROM clients WHERE email = 'admin@testpos.com');
DELETE FROM clients WHERE email = 'admin@testpos.com';

-- Generate UUIDs
SET @client_uuid = UUID();
SET @branch_uuid = UUID();
SET @role_uuid = UUID();
SET @user_uuid = UUID();

-- 1. Create test client
INSERT INTO clients (id, name, email, phone, address, is_active, created_at, server_updated_at)
VALUES (
  @client_uuid,
  'Test POS Client',
  'admin@testpos.com',
  '+201234567890',
  'Test Address, Cairo, Egypt',
  TRUE,
  NOW(),
  NOW()
);

-- 2. Create test branch
INSERT INTO branches (id, client_id, name, address, phone, is_active, created_at, server_updated_at)
VALUES (
  @branch_uuid,
  @client_uuid,
  'Main Branch',
  'Main Address, Cairo, Egypt',
  '+201234567890',
  TRUE,
  NOW(),
  NOW()
);

-- 3. Create admin role
INSERT INTO roles (id, client_id, name, permissions, created_at, server_updated_at)
VALUES (
  @role_uuid,
  @client_uuid,
  'admin',
  '["*"]',
  NOW(),
  NOW()
);

-- 4. Create admin user
INSERT INTO users (
  id,
  client_id,
  branch_id,
  username,
  password_hash,
  full_name,
  email,
  phone,
  role,
  is_active,
  created_at,
  server_updated_at
)
VALUES (
  @user_uuid,
  @client_uuid,
  @branch_uuid,
  'admin',
  '$2b$10$eR1g13Wq9Of6Y0hvs1PhNucEs8Imv3qGihRb7r4L91Zs50bOGjqmG',
  'Administrator',
  'admin@testpos.com',
  '+201234567890',
  'admin',
  TRUE,
  NOW(),
  NOW()
);

-- Verify
SELECT '=== Created Successfully ===' as status;
SELECT 'Client' as type, id, name FROM clients WHERE email = 'admin@testpos.com'
UNION ALL
SELECT 'Branch', id, name FROM branches WHERE client_id = @client_uuid
UNION ALL  
SELECT 'Role', id, name FROM roles WHERE id = @role_uuid
UNION ALL
SELECT 'User', id, username FROM users WHERE id = @user_uuid;

SELECT '=== Login: admin / admin123 ===' as credentials;
