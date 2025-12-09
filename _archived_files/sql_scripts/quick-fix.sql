-- Quick fixes for sync issues
USE pos_db;

-- Fix image_url column size
ALTER TABLE products MODIFY COLUMN image_url TEXT;

-- Verify
SELECT 'products.image_url fixed to TEXT' as status;
DESCRIBE products;
