-- Fix audit_logs foreign key issue
USE pos_db;

-- Option 1: Remove foreign key constraint on user_id (allow any value)
ALTER TABLE audit_logs DROP FOREIGN KEY audit_logs_ibfk_3;

-- Make user_id nullable without constraint
ALTER TABLE audit_logs MODIFY COLUMN user_id VARCHAR(36) NULL;

SELECT 'audit_logs foreign key removed - user_id now accepts any value' as status;
