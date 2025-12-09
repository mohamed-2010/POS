-- Add missing columns to existing tables
-- This script adds client_id and branch_id to tables that don't have them

USE pos_db;

-- Check and add columns to product_categories
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS client_id VARCHAR(36) NOT NULL AFTER id,
ADD COLUMN IF NOT EXISTS branch_id VARCHAR(36) AFTER client_id,
ADD COLUMN IF NOT EXISTS server_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER updated_at,
ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1 AFTER server_updated_at,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE AFTER sync_version;

-- Add foreign keys if they don't exist
ALTER TABLE product_categories
ADD CONSTRAINT fk_product_categories_client 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE product_categories
ADD CONSTRAINT fk_product_categories_branch 
FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- Add indexes
ALTER TABLE product_categories 
ADD INDEX IF NOT EXISTS idx_client_branch (client_id, branch_id),
ADD INDEX IF NOT EXISTS idx_server_updated_at (server_updated_at);

SELECT 'product_categories updated successfully' as status;

-- You can add similar ALTER statements for other tables as needed
