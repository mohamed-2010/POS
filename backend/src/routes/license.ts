import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { query } from "../config/database.js";
import { env } from "../config/env.js";
import { AlertService } from "../services/AlertService.js";
import { authMiddleware } from "../middlewares/auth.js";

// Validation schemas
const activateSchema = z.object({
  licenseKey: z
    .string()
    .min(16)
    .transform((key) => key.replace(/-/g, "")),
  deviceId: z.string(),
  clientId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  appVersion: z.string().optional(),
  platform: z.string().optional(),
  hostname: z.string().optional(),
});

const verifySchema = z.object({
  licenseKey: z
    .string()
    .min(16)
    .transform((key) => key.replace(/-/g, "")),
  deviceId: z.string(),
});

const deactivateSchema = z.object({
  licenseKey: z
    .string()
    .min(16)
    .transform((key) => key.replace(/-/g, "")),
  deviceId: z.string(),
  confirmationCode: z.string(),
});

interface License {
  id: string;
  license_key: string;
  device_id: string | null;
  client_id: string;
  branch_id: string | null;
  activated_at: Date | null;
  expires_at: Date | null;
  last_verified_at: Date | null;
  grace_period_ends_at: Date | null;
  is_active: boolean;
  max_devices: number;
  // Sync settings
  sync_interval: number | null;
  enable_sync: boolean | null;
  enable_offline_mode: boolean | null;
  auto_update: boolean | null;
}

// مفتاح التشفير السري - يجب أن يكون نفس المفتاح في الـ Electron
const ENCRYPTION_SECRET = "MASR-POS-2024-SECURE-KEY-@#$%^&*";

// Generate license key (format: XXXX-XXXX-XXXX-XXXX) with checksum
// متوافق مع خوارزمية الـ Electron
function generateLicenseKey(): string {
  // توليد 12 حرف عشوائي
  const randomPart = crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase()
    .substring(0, 12);

  // حساب الـ checksum (آخر 4 أحرف)
  const hash = crypto
    .createHash("md5")
    .update(randomPart + ENCRYPTION_SECRET)
    .digest("hex");
  const checksum = hash.substring(0, 4).toUpperCase();

  // تنسيق المفتاح على شكل XXXX-XXXX-XXXX-XXXX
  const fullKey = randomPart + checksum;
  return fullKey.match(/.{1,4}/g)?.join("-") || fullKey;
}

// Generate confirmation code for deactivation
function generateConfirmationCode(
  licenseKey: string,
  deviceId: string
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${licenseKey}:${deviceId}:${env.JWT_SECRET}`)
    .digest("hex");
  return hash.substring(0, 8).toUpperCase();
}

export default async function licenseRoutes(fastify: FastifyInstance) {
  // Activate License
  fastify.post(
    "/activate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = activateSchema.parse(request.body);

        // Check if license exists
        const licenses = await query<License>(
          "SELECT * FROM licenses WHERE license_key = ? LIMIT 1",
          [body.licenseKey]
        );

        if (licenses.length === 0) {
          return reply.code(404).send({
            error: "Not Found",
            message: "License key not found",
          });
        }

        const license = licenses[0];

        // Check if license is active
        if (!license.is_active) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "License is inactive",
          });
        }

        // Check if already activated on another device
        if (license.device_id && license.device_id !== body.deviceId) {
          return reply.code(409).send({
            error: "Conflict",
            message: "License already activated on another device",
            activatedDeviceId: license.device_id,
          });
        }

        // Check if expired
        if (license.expires_at && new Date() > new Date(license.expires_at)) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "License has expired",
            expiresAt: license.expires_at,
          });
        }

        // Activate license
        const now = new Date();
        const gracePeriodEnds = new Date(now);
        gracePeriodEnds.setDate(
          gracePeriodEnds.getDate() + env.LICENSE_GRACE_PERIOD_DAYS
        );

        await query(
          `UPDATE licenses 
         SET device_id = ?, 
             activated_at = ?, 
             last_verified_at = ?,
             grace_period_ends_at = ?,
             updated_at = NOW()
         WHERE license_key = ?`,
          [body.deviceId, now, now, gracePeriodEnds, body.licenseKey]
        );

        // Send alert (only if clientId provided or from license)
        const clientIdToUse = license.client_id;
        if (clientIdToUse) {
          await AlertService.sendLicenseAlert(
            clientIdToUse,
            `License ${body.licenseKey} activated on device ${body.deviceId}`
          );
        }

        // Generate sync token for API authentication
        const syncTokenPayload = {
          licenseKey: license.license_key,
          clientId: license.client_id,
          branchId: license.branch_id,
          deviceId: body.deviceId,
          type: "sync" as const,
        };
        const syncToken = fastify.jwt.sign(syncTokenPayload, { expiresIn: "365d" });

        // Get client name if available
        let merchantName = body.customerName || null;
        if (license.client_id) {
          try {
            const clients = await query<{ name: string }>(
              "SELECT name FROM clients WHERE id = ? LIMIT 1",
              [license.client_id]
            );
            if (clients.length > 0) {
              merchantName = clients[0].name;
            }
          } catch (e) {
            // Ignore if clients table doesn't exist
          }
        }

        return reply.send({
          success: true,
          message: "License activated successfully",
          deviceId: body.deviceId,
          activatedAt: now.toISOString(),
          expiresAt: license.expires_at?.toISOString() || null,
          gracePeriodEndsAt: gracePeriodEnds.toISOString(),
          // Sync credentials
          clientId: license.client_id,
          branchId: license.branch_id,
          syncToken: syncToken,
          merchantName: merchantName,
          // Sync settings (from license record)
          syncInterval: license.sync_interval ?? 300000, // default 5 min
          enableSync: license.enable_sync ?? true,
          enableOfflineMode: license.enable_offline_mode ?? false,
          autoUpdate: license.auto_update ?? true,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        throw error;
      }
    }
  );

  // Verify License
  fastify.post(
    "/verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = verifySchema.parse(request.body);

        // Get license
        const licenses = await query<License>(
          "SELECT * FROM licenses WHERE license_key = ? LIMIT 1",
          [body.licenseKey]
        );

        if (licenses.length === 0) {
          return reply.code(404).send({
            valid: false,
            error: "Not Found",
            message: "License key not found",
          });
        }

        const license = licenses[0];

        // Check if inactive
        if (!license.is_active) {
          return reply.send({
            valid: false,
            message: "License is inactive",
          });
        }

        // Check device match
        if (license.device_id && license.device_id !== body.deviceId) {
          return reply.send({
            valid: false,
            message: "License activated on different device",
            activatedDeviceId: license.device_id,
          });
        }

        // Check expiration
        if (license.expires_at && new Date() > new Date(license.expires_at)) {
          return reply.send({
            valid: false,
            message: "License has expired",
            expiresAt: license.expires_at,
          });
        }

        // Check if needs verification (30 days since last verify)
        const daysSinceVerification = license.last_verified_at
          ? Math.floor(
            (Date.now() - new Date(license.last_verified_at).getTime()) /
            (1000 * 60 * 60 * 24)
          )
          : 999;

        if (daysSinceVerification > env.LICENSE_VERIFICATION_INTERVAL_DAYS) {
          // Update verification timestamp
          await query(
            "UPDATE licenses SET last_verified_at = NOW() WHERE license_key = ?",
            [body.licenseKey]
          );
        }

        // Check grace period
        const inGracePeriod =
          license.grace_period_ends_at &&
          new Date() <= new Date(license.grace_period_ends_at);

        // Generate fresh sync token for API authentication
        const syncTokenPayload = {
          licenseKey: license.license_key,
          clientId: license.client_id,
          branchId: license.branch_id,
          deviceId: body.deviceId,
          type: "sync" as const,
        };
        const syncToken = fastify.jwt.sign(syncTokenPayload, { expiresIn: "365d" });

        // Get merchant name if available
        let merchantName = null;
        if (license.client_id) {
          try {
            const clients = await query<{ name: string }>(
              "SELECT name FROM clients WHERE id = ? LIMIT 1",
              [license.client_id]
            );
            if (clients.length > 0) {
              merchantName = clients[0].name;
            }
          } catch (e) {
            // Ignore if clients table doesn't exist
          }
        }

        return reply.send({
          valid: true,
          success: true,
          message: "License is valid",
          licenseKey: license.license_key,
          deviceId: license.device_id,
          activatedAt: license.activated_at,
          expiresAt: license.expires_at,
          lastVerifiedAt: new Date().toISOString(),
          inGracePeriod,
          gracePeriodEndsAt: license.grace_period_ends_at,
          // Sync credentials (always refresh on verify)
          clientId: license.client_id,
          branchId: license.branch_id,
          syncToken: syncToken,
          merchantName: merchantName,
          // Sync settings
          syncInterval: license.sync_interval ?? 300000,
          enableSync: license.enable_sync ?? true,
          enableOfflineMode: license.enable_offline_mode ?? false,
          autoUpdate: license.auto_update ?? true,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        throw error;
      }
    }
  );

  // Deactivate License
  fastify.post(
    "/deactivate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = deactivateSchema.parse(request.body);

        // Verify confirmation code
        const expectedCode = generateConfirmationCode(
          body.licenseKey,
          body.deviceId
        );
        if (body.confirmationCode !== expectedCode) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "Invalid confirmation code",
          });
        }

        // Get license
        const licenses = await query<License>(
          "SELECT * FROM licenses WHERE license_key = ? AND device_id = ? LIMIT 1",
          [body.licenseKey, body.deviceId]
        );

        if (licenses.length === 0) {
          return reply.code(404).send({
            error: "Not Found",
            message: "License not found or not activated on this device",
          });
        }

        // Deactivate
        await query(
          "UPDATE licenses SET device_id = NULL, grace_period_ends_at = NULL WHERE license_key = ?",
          [body.licenseKey]
        );

        // Send alert
        await AlertService.sendLicenseAlert(
          licenses[0].client_id,
          `License ${body.licenseKey} deactivated from device ${body.deviceId}`
        );

        return reply.send({
          success: true,
          message: "License deactivated successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        throw error;
      }
    }
  );

  // Generate License Key (Admin only)
  fastify.post(
    "/generate",
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      // Only super admin can generate licenses
      if (user.role !== "super_admin") {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only super admin can generate license keys",
        });
      }

      try {
        const schema = z.object({
          clientId: z.string().uuid(),
          branchId: z.string().uuid().optional(),
          customerName: z.string().optional(),
          customerEmail: z.string().email().optional(),
          expiresAt: z.string().datetime().optional(),
          maxDevices: z.number().int().positive().default(1),
        });

        const body = schema.parse(request.body);
        const licenseKey = generateLicenseKey();

        await query(
          `INSERT INTO licenses 
         (id, license_key, client_id, branch_id, customer_name, customer_email, expires_at, max_devices)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
          [
            licenseKey,
            body.clientId,
            body.branchId || null,
            body.customerName || null,
            body.customerEmail || null,
            body.expiresAt || null,
            body.maxDevices,
          ]
        );

        return reply.send({
          success: true,
          licenseKey,
          clientId: body.clientId,
          expiresAt: body.expiresAt || null,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        throw error;
      }
    }
  );
}
