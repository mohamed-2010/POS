/**
 * أداة توليد مفاتيح الترخيص
 * للاستخدام من قبل الإدارة فقط
 *
 * طريقة الاستخدام:
 * node generate-license.js
 * node generate-license.js 10    # توليد 10 مفاتيح
 */

import crypto from "crypto";

// المفتاح السري (يجب أن يكون نفسه في licenseManager.ts)
const ENCRYPTION_SECRET = "MASR-POS-2024-SECURE-KEY-@#$%^&*";

/**
 * توليد مفتاح ترخيص جديد
 */
function generateLicenseKey() {
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
 * التحقق من صحة المفتاح
 */
function validateLicenseKey(licenseKey) {
  // تنظيف المفتاح
  const cleanKey = licenseKey.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  // المفتاح يجب أن يكون 16 حرف
  if (cleanKey.length !== 16) {
    return false;
  }

  // التحقق من الـ checksum
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

// Main
const count = parseInt(process.argv[2]) || 1;

console.log("\n🔐 مولّد مفاتيح الترخيص - H-POS\n");
console.log("═".repeat(50));

for (let i = 0; i < count; i++) {
  const key = generateLicenseKey();
  const isValid = validateLicenseKey(key);
  console.log(`\n${i + 1}. ${key}`);
  console.log(`   ✅ صالح: ${isValid ? "نعم" : "لا"}`);
}

console.log("\n" + "═".repeat(50));
console.log(`\n✨ تم توليد ${count} مفتاح/مفاتيح بنجاح!\n`);
console.log("📌 تعليمات:");
console.log("   • أعطِ المفتاح للعميل عند الشراء");
console.log("   • كل مفتاح يعمل على جهاز واحد فقط");
console.log("   • احتفظ بسجل للمفاتيح والعملاء\n");
