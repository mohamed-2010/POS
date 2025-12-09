-- إضافة test client و license للتجربة

-- إضافة client تجريبي
INSERT INTO clients (id, name, name_en, tax_number, email, phone, is_active)
VALUES (
  UUID(),
  'شركة تجريبية',
  'Test Company',
  '1234567890',
  'test@example.com',
  '0501234567',
  TRUE
) ON DUPLICATE KEY UPDATE id=id;

-- الحصول على client_id
SET @client_id = (SELECT id FROM clients LIMIT 1);

-- إضافة license key تجريبي
INSERT INTO licenses (
  id,
  license_key,
  client_id,
  customer_name,
  is_active,
  expires_at,
  max_devices
)
VALUES (
  UUID(),
  'TEST1234ABCD5678',
  @client_id,
  'عميل تجريبي',
  TRUE,
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  5
) ON DUPLICATE KEY UPDATE license_key=license_key;

-- عرض النتيجة
SELECT 
  l.license_key,
  l.customer_name,
  l.is_active,
  l.expires_at,
  c.name
FROM licenses l
JOIN clients c ON l.client_id = c.id
WHERE l.license_key = 'TEST1234ABCD5678';
