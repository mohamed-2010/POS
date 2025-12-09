-- Simple script to add sync columns to product_categories
-- Works with all MySQL versions

USE pos_db;

-- Get default client and branch from existing user
SET @default_client = (SELECT client_id FROM users WHERE username='admin' LIMIT 1);
SET @default_branch = (SELECT branch_id FROM users WHERE username='admin' LIMIT 1);

SELECT @default_client as client_id, @default_branch as branch_id;

-- Add columns (will fail if already exist, which is okay)
ALTER TABLE product_categories 
ADD COLUMN client_id VARCHAR(36) AFTER id;

ALTER TABLE product_categories 
ADD COLUMN branch_id VARCHAR(36) AFTER client_id;

ALTER TABLE product_categories 
ADD COLUMN server_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE product_categories 
ADD COLUMN sync_version INT DEFAULT 1;

ALTER TABLE product_categories 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Update existing rows with default values
UPDATE product_categories 
SET client_id = @default_client, 
    branch_id = @default_branch,
    server_updated_at = NOW(),
    sync_version = 1,
    is_deleted = FALSE
WHERE client_id IS NULL OR client_id = '';

-- Add indexes
ALTER TABLE product_categories 
ADD INDEX idx_client_branch (client_id, branch_id);

ALTER TABLE product_categories 
ADD INDEX idx_server_updated_at (server_updated_at);

SELECT 'product_categories table updated successfully!' as status;
DESCRIBE product_categories;
