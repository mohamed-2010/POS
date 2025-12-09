-- Remove problematic foreign key constraints
-- This allows sync to work with any ID values

USE pos_db;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Products: category_id constraint
ALTER TABLE products DROP FOREIGN KEY products_ibfk_3;

-- Shifts: employee_id constraint  
ALTER TABLE shifts DROP FOREIGN KEY shifts_ibfk_3;

-- Invoices: customer_id constraint
ALTER TABLE invoices DROP FOREIGN KEY invoices_ibfk_3;

-- Purchases: supplier_id constraint
ALTER TABLE purchases DROP FOREIGN KEY purchases_ibfk_3;

-- Payments: invoice_id, customer_id constraints
-- (may not exist, ignore errors)

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Foreign key constraints removed successfully!' as status;
