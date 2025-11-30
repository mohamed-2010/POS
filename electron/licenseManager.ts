/**
 * License Manager - نظام حماية احترافي للتطبيق
 * يمنع تشغيل النسخة على أكثر من جهاز
 *
 * يستخدم التحقق المركزي (Online) + Offline Fallback
 */

import { app, ipcMain } from "electron";
import * as crypto from "crypto";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ==================== Constants ====================

// مفتاح التشفير السري (غيّره لقيمة سرية خاصة بك)
const ENCRYPTION_SECRET = "MASR-POS-2024-SECURE-KEY-@#$%^&*";
const LICENSE_FILE_NAME = "license.dat";
const ALGORITHM = "aes-256-gcm";

// ==================== License Server Configuration ====================
// غيّر هذا لعنوان السيرفر الخاص بك
const LICENSE_SERVER_URL = "https://your-license-server.com/api/license";
// أو استخدم Google Sheets / Firebase / Supabase كـ backend مجاني
const USE_ONLINE_VALIDATION = true; // فعّل هذا عندما يكون السيرفر جاهز

// ==================== Interfaces ====================

interface LicenseData {
  licenseKey: string;
  deviceId: string;
  activationDate: string;
  expiryDate?: string;
  customerName?: string;
  features?: string[];
  maxDevices?: number;
  lastOnlineCheck?: string; // آخر تحقق من السيرفر
  serverValidated?: boolean; // هل تم التحقق من السيرفر
}

interface HardwareInfo {
  cpuId: string;
  macAddress: string;
  hostname: string;
  platform: string;
  diskSerial: string;
  username: string;
}

interface EncryptedData {
  iv: string;
  authTag: string;
  data: string;
}

// ==================== Hardware Fingerprint ====================

/**
 * الحصول على معلومات الـ Hardware الفريدة للجهاز
 */
function getHardwareInfo(): HardwareInfo {
  // CPU ID
  let cpuId = "";
  try {
    if (process.platform === "win32") {
      cpuId =
        execSync("wmic cpu get processorid", { encoding: "utf8" })
          .split("\n")[1]
          ?.trim() || "";
    } else if (process.platform === "darwin") {
      cpuId = execSync("sysctl -n machdep.cpu.brand_string", {
        encoding: "utf8",
      }).trim();
      // أيضاً نحصل على serial number
      try {
        const serial = execSync(
          "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformSerialNumber/ { print $3 }'",
          { encoding: "utf8" }
        )
          .trim()
          .replace(/"/g, "");
        cpuId += `-${serial}`;
      } catch {}
    } else {
      cpuId = execSync("cat /proc/cpuinfo | grep 'Serial' | awk '{print $3}'", {
        encoding: "utf8",
      }).trim();
    }
  } catch (e) {
    cpuId = os.cpus()[0]?.model || "unknown";
  }

  // MAC Address
  let macAddress = "";
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[name];
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
          macAddress = iface.mac;
          break;
        }
      }
    }
    if (macAddress) break;
  }

  // Disk Serial
  let diskSerial = "";
  try {
    if (process.platform === "win32") {
      diskSerial =
        execSync("wmic diskdrive get serialnumber", { encoding: "utf8" })
          .split("\n")[1]
          ?.trim() || "";
    } else if (process.platform === "darwin") {
      diskSerial = execSync(
        "system_profiler SPHardwareDataType | awk '/Hardware UUID/ { print $3 }'",
        { encoding: "utf8" }
      ).trim();
    } else {
      diskSerial = execSync("lsblk -o SERIAL | head -2 | tail -1", {
        encoding: "utf8",
      }).trim();
    }
  } catch (e) {
    diskSerial = "unknown";
  }

  return {
    cpuId,
    macAddress,
    hostname: os.hostname(),
    platform: `${process.platform}-${process.arch}`,
    diskSerial,
    username: os.userInfo().username,
  };
}

/**
 * توليد بصمة فريدة للجهاز (Device ID)
 */
function generateDeviceId(): string {
  const hw = getHardwareInfo();
  const rawFingerprint = `${hw.cpuId}|${hw.macAddress}|${hw.diskSerial}|${hw.platform}`;

  // تشفير البصمة بـ SHA-256
  const hash = crypto.createHash("sha256").update(rawFingerprint).digest("hex");

  // تنسيق البصمة على شكل مجموعات (مثل: XXXX-XXXX-XXXX-XXXX)
  return (
    hash
      .substring(0, 32)
      .toUpperCase()
      .match(/.{1,8}/g)
      ?.join("-") || hash.substring(0, 32)
  );
}

// ==================== Online License Validation ====================

interface ServerLicenseResponse {
  success: boolean;
  message: string;
  valid?: boolean;
  deviceId?: string;
  expiryDate?: string;
  customerName?: string;
  isAlreadyActivated?: boolean;
  activatedDeviceId?: string;
}

/**
 * التحقق من الترخيص من السيرفر المركزي
 */
async function validateLicenseOnline(
  licenseKey: string,
  deviceId: string
): Promise<ServerLicenseResponse> {
  if (!USE_ONLINE_VALIDATION) {
    // إذا التحقق الأونلاين معطّل، نرجع نجاح
    return { success: true, valid: true, message: "Offline mode" };
  }

  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licenseKey,
        deviceId,
        appVersion: app.getVersion(),
        platform: process.platform,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Online validation error:", error);
    // في حالة فشل الاتصال، نسمح بالعمل offline مؤقتاً
    return {
      success: false,
      message: "فشل الاتصال بالسيرفر. يعمل التطبيق في وضع offline.",
    };
  }
}

/**
 * تفعيل الترخيص على السيرفر المركزي
 */
async function activateLicenseOnline(
  licenseKey: string,
  deviceId: string,
  customerName?: string
): Promise<ServerLicenseResponse> {
  if (!USE_ONLINE_VALIDATION) {
    return { success: true, valid: true, message: "Offline mode" };
  }

  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licenseKey,
        deviceId,
        customerName,
        appVersion: app.getVersion(),
        platform: process.platform,
        hostname: os.hostname(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Server error: ${response.status}`,
        isAlreadyActivated: errorData.isAlreadyActivated,
        activatedDeviceId: errorData.activatedDeviceId,
      };
    }

    return await response.json();
  } catch (error: any) {
    console.error("Online activation error:", error);
    return {
      success: false,
      message: "فشل الاتصال بالسيرفر. تأكد من اتصال الإنترنت.",
    };
  }
}

/**
 * إلغاء تفعيل الترخيص من السيرفر
 */
async function deactivateLicenseOnline(
  licenseKey: string,
  deviceId: string
): Promise<ServerLicenseResponse> {
  if (!USE_ONLINE_VALIDATION) {
    return { success: true, message: "Offline mode" };
  }

  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/deactivate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licenseKey,
        deviceId,
      }),
    });

    return await response.json();
  } catch (error: any) {
    console.error("Online deactivation error:", error);
    return { success: false, message: "فشل الاتصال بالسيرفر." };
  }
}

// ==================== Encryption ====================

/**
 * توليد مفتاح التشفير من الـ secret
 */
function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "salt-masr-pos", 32);
}

/**
 * تشفير البيانات
 */
function encryptData(data: string): EncryptedData {
  const key = deriveKey(ENCRYPTION_SECRET);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
    data: encrypted,
  };
}

/**
 * فك تشفير البيانات
 */
function decryptData(encrypted: EncryptedData): string {
  const key = deriveKey(ENCRYPTION_SECRET);
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ==================== License File Management ====================

/**
 * الحصول على مسار ملف الترخيص
 */
function getLicenseFilePath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, LICENSE_FILE_NAME);
}

/**
 * حفظ بيانات الترخيص
 */
function saveLicenseData(data: LicenseData): boolean {
  try {
    const jsonData = JSON.stringify(data);
    const encrypted = encryptData(jsonData);
    const filePath = getLicenseFilePath();

    fs.writeFileSync(filePath, JSON.stringify(encrypted), "utf8");
    return true;
  } catch (error) {
    console.error("Error saving license:", error);
    return false;
  }
}

/**
 * قراءة بيانات الترخيص
 */
function loadLicenseData(): LicenseData | null {
  try {
    const filePath = getLicenseFilePath();

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const encrypted: EncryptedData = JSON.parse(fileContent);
    const decrypted = decryptData(encrypted);

    return JSON.parse(decrypted) as LicenseData;
  } catch (error) {
    console.error("Error loading license:", error);
    return null;
  }
}

/**
 * حذف ملف الترخيص
 */
function deleteLicenseData(): boolean {
  try {
    const filePath = getLicenseFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error("Error deleting license:", error);
    return false;
  }
}

// ==================== License Validation ====================

/**
 * التحقق من صحة مفتاح الترخيص (يمكنك تخصيص هذه الدالة حسب نظام الترخيص الخاص بك)
 *
 * صيغة المفتاح المقترحة: XXXX-XXXX-XXXX-XXXX
 * حيث آخر 4 أحرف هي checksum
 */
function validateLicenseKeyFormat(licenseKey: string): boolean {
  // تنظيف المفتاح
  const cleanKey = licenseKey.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  // المفتاح يجب أن يكون 16 حرف
  if (cleanKey.length !== 16) {
    return false;
  }

  // التحقق من الـ checksum (آخر 4 أحرف)
  const keyPart = cleanKey.substring(0, 12);
  const checksum = cleanKey.substring(12, 16);

  // حساب الـ checksum المتوقع
  const hash = crypto
    .createHash("md5")
    .update(keyPart + ENCRYPTION_SECRET)
    .digest("hex");
  const expectedChecksum = hash.substring(0, 4).toUpperCase();

  return checksum === expectedChecksum;
}

/**
 * توليد مفتاح ترخيص جديد (للاستخدام من جانب الإدارة)
 */
function generateLicenseKey(): string {
  // توليد 12 حرف عشوائي
  const randomPart = crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase()
    .substring(0, 12);

  // حساب الـ checksum
  const hash = crypto
    .createHash("md5")
    .update(randomPart + ENCRYPTION_SECRET)
    .digest("hex");
  const checksum = hash.substring(0, 4).toUpperCase();

  // تنسيق المفتاح
  const fullKey = randomPart + checksum;
  return fullKey.match(/.{1,4}/g)?.join("-") || fullKey;
}

/**
 * التحقق من صلاحية الترخيص
 * يتحقق محلياً أولاً، ثم من السيرفر إذا متاح
 */
async function verifyLicense(): Promise<{
  valid: boolean;
  message: string;
  data?: LicenseData;
}> {
  const licenseData = loadLicenseData();

  if (!licenseData) {
    return {
      valid: false,
      message: "لم يتم العثور على ترخيص. يرجى تفعيل التطبيق.",
    };
  }

  // التحقق من Device ID
  const currentDeviceId = generateDeviceId();
  if (licenseData.deviceId !== currentDeviceId) {
    return {
      valid: false,
      message:
        "هذا الترخيص مسجل على جهاز آخر. يرجى التواصل مع الدعم الفني للحصول على ترخيص جديد.",
    };
  }

  // التحقق من تاريخ الانتهاء (إذا موجود)
  if (licenseData.expiryDate) {
    const expiryDate = new Date(licenseData.expiryDate);
    if (new Date() > expiryDate) {
      return {
        valid: false,
        message: `انتهت صلاحية الترخيص في ${expiryDate.toLocaleDateString(
          "ar-EG"
        )}. يرجى تجديد الاشتراك.`,
      };
    }
  }

  // التحقق من السيرفر (إذا مفعّل ومر وقت كافي من آخر تحقق)
  if (USE_ONLINE_VALIDATION) {
    const lastCheck = licenseData.lastOnlineCheck
      ? new Date(licenseData.lastOnlineCheck)
      : null;
    const hoursSinceLastCheck = lastCheck
      ? (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60)
      : 999;

    // تحقق كل 24 ساعة
    if (hoursSinceLastCheck > 24) {
      try {
        const serverResult = await validateLicenseOnline(
          licenseData.licenseKey,
          currentDeviceId
        );

        if (serverResult.success && serverResult.valid === false) {
          // المفتاح غير صالح أو مُلغى من السيرفر
          return {
            valid: false,
            message:
              serverResult.message || "الترخيص غير صالح. تواصل مع الدعم الفني.",
          };
        }

        // تحديث آخر تحقق
        if (serverResult.success) {
          licenseData.lastOnlineCheck = new Date().toISOString();
          saveLicenseData(licenseData);
        }
      } catch (error) {
        // في حالة فشل الاتصال، نسمح بالعمل offline
        console.warn("Online check failed, continuing offline:", error);
      }
    }
  }

  return { valid: true, message: "الترخيص صالح", data: licenseData };
}

// ==================== Activation ====================

/**
 * تفعيل الترخيص
 * 1. التحقق من صيغة المفتاح
 * 2. التحقق من السيرفر (إذا متاح)
 * 3. حفظ الترخيص محلياً
 */
async function activateLicense(
  licenseKey: string,
  customerName?: string,
  expiryDate?: string
): Promise<{ success: boolean; message: string; deviceId?: string }> {
  // التحقق من صيغة المفتاح
  if (!validateLicenseKeyFormat(licenseKey)) {
    return {
      success: false,
      message:
        "مفتاح الترخيص غير صالح. يرجى التحقق من المفتاح والمحاولة مرة أخرى.",
    };
  }

  // التحقق إذا كان هناك ترخيص موجود محلياً
  const existingLicense = loadLicenseData();
  if (existingLicense) {
    const currentDeviceId = generateDeviceId();
    if (existingLicense.deviceId === currentDeviceId) {
      return {
        success: false,
        message: "التطبيق مفعّل بالفعل على هذا الجهاز.",
      };
    }
  }

  // توليد Device ID
  const deviceId = generateDeviceId();

  // التحقق من السيرفر المركزي (إذا مفعّل)
  if (USE_ONLINE_VALIDATION) {
    const serverResponse = await activateLicenseOnline(
      licenseKey,
      deviceId,
      customerName
    );

    if (!serverResponse.success) {
      // إذا المفتاح مستخدم على جهاز آخر
      if (serverResponse.isAlreadyActivated) {
        return {
          success: false,
          message: `⚠️ هذا المفتاح مُفعّل بالفعل على جهاز آخر!\n\nمعرّف الجهاز المُفعّل: ${serverResponse.activatedDeviceId?.substring(
            0,
            15
          )}...\n\nللنقل إلى هذا الجهاز، تواصل مع الدعم الفني.`,
        };
      }
      return { success: false, message: serverResponse.message };
    }

    // استخدام البيانات من السيرفر
    if (serverResponse.expiryDate) {
      expiryDate = serverResponse.expiryDate;
    }
    if (serverResponse.customerName) {
      customerName = serverResponse.customerName;
    }
  }

  // إنشاء بيانات الترخيص
  const licenseData: LicenseData = {
    licenseKey: licenseKey.toUpperCase(),
    deviceId,
    activationDate: new Date().toISOString(),
    expiryDate: expiryDate || undefined,
    customerName: customerName || undefined,
    lastOnlineCheck: new Date().toISOString(),
    serverValidated: USE_ONLINE_VALIDATION,
  };

  // حفظ الترخيص
  if (saveLicenseData(licenseData)) {
    return {
      success: true,
      message: "تم تفعيل الترخيص بنجاح! 🎉",
      deviceId,
    };
  } else {
    return {
      success: false,
      message: "حدث خطأ أثناء حفظ الترخيص. يرجى المحاولة مرة أخرى.",
    };
  }
}

/**
 * إلغاء تفعيل الترخيص (للانتقال لجهاز آخر)
 */
async function deactivateLicense(
  confirmationCode: string
): Promise<{ success: boolean; message: string }> {
  // كود التأكيد للأمان (يمكن تخصيصه)
  const expectedCode =
    "RESET-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");

  if (confirmationCode !== expectedCode) {
    return { success: false, message: "كود التأكيد غير صحيح." };
  }

  // إلغاء التفعيل من السيرفر (إذا مفعّل)
  const licenseData = loadLicenseData();
  if (USE_ONLINE_VALIDATION && licenseData) {
    const serverResponse = await deactivateLicenseOnline(
      licenseData.licenseKey,
      licenseData.deviceId
    );
    if (!serverResponse.success) {
      console.warn("Failed to deactivate on server:", serverResponse.message);
      // نستمر في الحذف المحلي حتى لو فشل السيرفر
    }
  }

  if (deleteLicenseData()) {
    return {
      success: true,
      message: "تم إلغاء تفعيل الترخيص. يمكنك الآن تفعيله على جهاز آخر.",
    };
  } else {
    return { success: false, message: "حدث خطأ أثناء إلغاء التفعيل." };
  }
}

// ==================== IPC Handlers ====================

export function registerLicenseHandlers() {
  // الحصول على Device ID الحالي
  ipcMain.handle("license:get-device-id", () => {
    return generateDeviceId();
  });

  // الحصول على معلومات الـ Hardware
  ipcMain.handle("license:get-hardware-info", () => {
    return getHardwareInfo();
  });

  // التحقق من الترخيص
  ipcMain.handle("license:verify", async () => {
    return await verifyLicense();
  });

  // تفعيل الترخيص
  ipcMain.handle(
    "license:activate",
    async (
      _event,
      licenseKey: string,
      customerName?: string,
      expiryDate?: string
    ) => {
      return await activateLicense(licenseKey, customerName, expiryDate);
    }
  );

  // إلغاء تفعيل الترخيص
  ipcMain.handle(
    "license:deactivate",
    async (_event, confirmationCode: string) => {
      return await deactivateLicense(confirmationCode);
    }
  );

  // الحصول على بيانات الترخيص
  ipcMain.handle("license:get-data", async () => {
    const result = await verifyLicense();
    if (result.valid && result.data) {
      return {
        success: true,
        data: {
          licenseKey: result.data.licenseKey,
          deviceId: result.data.deviceId,
          activationDate: result.data.activationDate,
          expiryDate: result.data.expiryDate,
          customerName: result.data.customerName,
        },
      };
    }
    return { success: false, message: result.message };
  });

  // توليد مفتاح جديد (للمطورين/الإدارة فقط)
  ipcMain.handle("license:generate-key", () => {
    // هذا للتطوير فقط - في الإنتاج يجب إزالته أو حمايته
    if (!app.isPackaged) {
      return generateLicenseKey();
    }
    return null;
  });

  // التحقق من السيرفر يدوياً
  ipcMain.handle("license:check-online", async () => {
    const licenseData = loadLicenseData();
    if (!licenseData) {
      return { success: false, message: "لا يوجد ترخيص" };
    }

    const result = await validateLicenseOnline(
      licenseData.licenseKey,
      licenseData.deviceId
    );

    // تحديث آخر تحقق
    if (result.success) {
      licenseData.lastOnlineCheck = new Date().toISOString();
      saveLicenseData(licenseData);
    }

    return result;
  });
}

// ==================== Exports ====================

export { verifyLicense, generateDeviceId, generateLicenseKey, getHardwareInfo };
