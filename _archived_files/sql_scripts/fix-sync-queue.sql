-- Fix sync_queue table to add branch_id column
USE pos_db;

-- Add branch_id to sync_queue if not exists
ALTER TABLE sync_queue 
ADD COLUMN branch_id VARCHAR(36) AFTER client_id;

-- Add index
ALTER TABLE sync_queue 
ADD INDEX idx_client_branch (client_id, branch_id);

SELECT 'sync_queue table updated successfully!' as status;
DESCRIBE sync_queue;
