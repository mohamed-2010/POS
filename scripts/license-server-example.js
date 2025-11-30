/**
 * License Server Example
 * =====================
 *
 * هذا مثال لـ API server لإدارة التراخيص
 * يمكنك استخدامه مع:
 * - Node.js + Express
 * - Firebase Functions
 * - Supabase Edge Functions
 * - Vercel Serverless
 * - أي backend آخر
 *
 * Database Schema المقترح:
 * ========================
 *
 * licenses {
 *   id: string (primary key)
 *   license_key: string (unique)
 *   device_id: string | null
 *   customer_name: string
 *   customer_email: string
 *   customer_phone: string
 *   activated_at: timestamp | null
 *   expires_at: timestamp | null
 *   is_active: boolean
 *   max_devices: number (default: 1)
 *   notes: string
 *   created_at: timestamp
 *   updated_at: timestamp
 * }
 *
 * activation_logs {
 *   id: string
 *   license_id: string (foreign key)
 *   device_id: string
 *   action: 'activate' | 'deactivate' | 'validate'
 *   ip_address: string
 *   platform: string
 *   app_version: string
 *   hostname: string
 *   created_at: timestamp
 * }
 */

// ==================== Express.js Example ====================

/*
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// In-memory storage (use a real database in production)
const licenses = new Map();
const ENCRYPTION_SECRET = "MASR-POS-2024-SECURE-KEY-@#$%^&*";

// Validate license key format
function validateLicenseKeyFormat(licenseKey: string): boolean {
  const cleanKey = licenseKey.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleanKey.length !== 16) return false;
  
  const keyPart = cleanKey.substring(0, 12);
  const checksum = cleanKey.substring(12, 16);
  const hash = crypto.createHash("md5").update(keyPart + ENCRYPTION_SECRET).digest("hex");
  const expectedChecksum = hash.substring(0, 4).toUpperCase();
  
  return checksum === expectedChecksum;
}

// Validate license
app.post('/api/license/validate', async (req, res) => {
  const { licenseKey, deviceId } = req.body;
  
  if (!licenseKey || !deviceId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  const license = licenses.get(licenseKey.toUpperCase());
  
  if (!license) {
    return res.json({ success: true, valid: false, message: 'License not found' });
  }
  
  if (!license.is_active) {
    return res.json({ success: true, valid: false, message: 'License is disabled' });
  }
  
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return res.json({ success: true, valid: false, message: 'License expired' });
  }
  
  // Check if device matches
  if (license.device_id && license.device_id !== deviceId) {
    return res.json({ 
      success: true, 
      valid: false, 
      message: 'License activated on different device',
      activatedDeviceId: license.device_id.substring(0, 15) + '...'
    });
  }
  
  return res.json({ success: true, valid: true, message: 'License valid' });
});

// Activate license
app.post('/api/license/activate', async (req, res) => {
  const { licenseKey, deviceId, customerName, platform, hostname } = req.body;
  
  if (!licenseKey || !deviceId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  if (!validateLicenseKeyFormat(licenseKey)) {
    return res.json({ success: false, message: 'Invalid license key format' });
  }
  
  let license = licenses.get(licenseKey.toUpperCase());
  
  // If license doesn't exist, create it (or reject based on your business logic)
  if (!license) {
    license = {
      license_key: licenseKey.toUpperCase(),
      device_id: null,
      customer_name: customerName,
      is_active: true,
      max_devices: 1,
      created_at: new Date().toISOString()
    };
    licenses.set(licenseKey.toUpperCase(), license);
  }
  
  // Check if already activated on another device
  if (license.device_id && license.device_id !== deviceId) {
    return res.json({ 
      success: false, 
      message: 'هذا المفتاح مُفعّل بالفعل على جهاز آخر',
      isAlreadyActivated: true,
      activatedDeviceId: license.device_id.substring(0, 15) + '...'
    });
  }
  
  // Activate on this device
  license.device_id = deviceId;
  license.activated_at = new Date().toISOString();
  license.customer_name = customerName || license.customer_name;
  licenses.set(licenseKey.toUpperCase(), license);
  
  return res.json({ 
    success: true, 
    message: 'License activated successfully',
    expiryDate: license.expires_at,
    customerName: license.customer_name
  });
});

// Deactivate license
app.post('/api/license/deactivate', async (req, res) => {
  const { licenseKey, deviceId } = req.body;
  
  const license = licenses.get(licenseKey.toUpperCase());
  
  if (!license) {
    return res.json({ success: false, message: 'License not found' });
  }
  
  if (license.device_id !== deviceId) {
    return res.json({ success: false, message: 'Device mismatch' });
  }
  
  // Clear device binding
  license.device_id = null;
  license.activated_at = null;
  licenses.set(licenseKey.toUpperCase(), license);
  
  return res.json({ success: true, message: 'License deactivated' });
});

// Admin: Create license
app.post('/api/admin/license/create', async (req, res) => {
  const { customerName, customerEmail, expiresAt, notes } = req.body;
  
  // Generate license key
  const randomPart = crypto.randomBytes(6).toString("hex").toUpperCase().substring(0, 12);
  const hash = crypto.createHash("md5").update(randomPart + ENCRYPTION_SECRET).digest("hex");
  const checksum = hash.substring(0, 4).toUpperCase();
  const fullKey = randomPart + checksum;
  const licenseKey = fullKey.match(/.{1,4}/g)?.join("-") || fullKey;
  
  const license = {
    license_key: licenseKey,
    device_id: null,
    customer_name: customerName,
    customer_email: customerEmail,
    is_active: true,
    expires_at: expiresAt,
    notes: notes,
    created_at: new Date().toISOString()
  };
  
  licenses.set(licenseKey, license);
  
  return res.json({ success: true, license });
});

// Admin: Reset license (allow re-activation on new device)
app.post('/api/admin/license/reset', async (req, res) => {
  const { licenseKey } = req.body;
  
  const license = licenses.get(licenseKey.toUpperCase());
  
  if (!license) {
    return res.json({ success: false, message: 'License not found' });
  }
  
  license.device_id = null;
  license.activated_at = null;
  licenses.set(licenseKey.toUpperCase(), license);
  
  return res.json({ success: true, message: 'License reset, can be activated on new device' });
});

// Admin: List all licenses
app.get('/api/admin/licenses', async (req, res) => {
  const allLicenses = Array.from(licenses.values());
  return res.json({ success: true, licenses: allLicenses });
});

app.listen(3001, () => {
  console.log('License server running on port 3001');
});
*/

// ==================== Firebase/Supabase Schema ====================

/*
-- SQL Schema for Supabase/PostgreSQL

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key VARCHAR(20) UNIQUE NOT NULL,
  device_id VARCHAR(40),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  max_devices INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  device_id VARCHAR(40) NOT NULL,
  action VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45),
  platform VARCHAR(50),
  app_version VARCHAR(20),
  hostname VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_device ON licenses(device_id);
CREATE INDEX idx_logs_license ON activation_logs(license_id);
*/

// ==================== Google Sheets as Backend ====================

/*
يمكنك استخدام Google Sheets كـ backend مجاني بسيط:

1. أنشئ Google Sheet بالأعمدة:
   - License Key
   - Device ID
   - Customer Name
   - Activated At
   - Expires At
   - Is Active

2. انشر كـ Web App باستخدام Google Apps Script:

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  const { action, licenseKey, deviceId } = data;
  
  // Find license row
  const keys = sheet.getRange('A:A').getValues();
  let rowIndex = -1;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i][0] === licenseKey) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (action === 'validate') {
    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ valid: false }));
    }
    const storedDeviceId = sheet.getRange(rowIndex, 2).getValue();
    const isActive = sheet.getRange(rowIndex, 6).getValue();
    
    if (!isActive) {
      return ContentService.createTextOutput(JSON.stringify({ valid: false, message: 'Disabled' }));
    }
    
    if (storedDeviceId && storedDeviceId !== deviceId) {
      return ContentService.createTextOutput(JSON.stringify({ 
        valid: false, 
        isAlreadyActivated: true,
        activatedDeviceId: storedDeviceId.substring(0, 15)
      }));
    }
    
    return ContentService.createTextOutput(JSON.stringify({ valid: true }));
  }
  
  if (action === 'activate') {
    if (rowIndex === -1) {
      // Create new license
      sheet.appendRow([licenseKey, deviceId, data.customerName, new Date(), '', true]);
    } else {
      const storedDeviceId = sheet.getRange(rowIndex, 2).getValue();
      if (storedDeviceId && storedDeviceId !== deviceId) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          isAlreadyActivated: true 
        }));
      }
      sheet.getRange(rowIndex, 2).setValue(deviceId);
      sheet.getRange(rowIndex, 4).setValue(new Date());
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }));
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }));
}
*/

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    License Server Guide                         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  هذا الملف يحتوي على أمثلة لإنشاء سيرفر تراخيص                ║
║                                                                  ║
║  الخيارات المتاحة:                                              ║
║  ─────────────────                                               ║
║  1. Express.js Server (Node.js)                                  ║
║  2. Firebase Functions                                           ║
║  3. Supabase Edge Functions                                      ║
║  4. Google Sheets (مجاني وبسيط)                                 ║
║  5. Vercel Serverless                                            ║
║                                                                  ║
║  لتفعيل التحقق الأونلاين:                                       ║
║  ──────────────────────────                                      ║
║  1. أنشئ السيرفر باستخدام أحد الخيارات أعلاه                   ║
║  2. غيّر LICENSE_SERVER_URL في licenseManager.ts                ║
║  3. غيّر USE_ONLINE_VALIDATION = true                           ║
║                                                                  ║
╚════════════════════════════════════════════════════════════════╝
`);
