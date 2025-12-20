/**
 * App Updates Routes
 * Handles app version checking and update file serving
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { query } from "../config/database.js";
import path from "path";
import fs from "fs";

// Schema for version check request
const versionCheckSchema = z.object({
    currentVersion: z.string(),
    platform: z.enum(["win32", "darwin", "linux"]),
    arch: z.enum(["x64", "arm64", "ia32"]).optional(),
});

interface AppVersion {
    id: string;
    version: string;
    platform: string;
    download_url: string;
    release_notes: string;
    file_size: number;
    checksum: string;
    is_mandatory: boolean;
    created_at: Date;
}

export default async function updateRoutes(fastify: FastifyInstance) {
    /**
     * Check for updates
     * POST /api/updates/check
     */
    fastify.post(
        "/check",
        async (
            request: FastifyRequest<{ Body: z.infer<typeof versionCheckSchema> }>,
            reply: FastifyReply
        ) => {
            try {
                const body = versionCheckSchema.parse(request.body);

                // Get latest version for this platform
                const versions = await query<AppVersion>(
                    `SELECT * FROM app_versions 
           WHERE platform = ? AND is_active = TRUE 
           ORDER BY created_at DESC 
           LIMIT 1`,
                    [body.platform]
                );

                if (versions.length === 0) {
                    return reply.send({
                        updateAvailable: false,
                        currentVersion: body.currentVersion,
                    });
                }

                const latestVersion = versions[0];

                // Compare versions
                const isNewer = compareVersions(latestVersion.version, body.currentVersion) > 0;

                if (!isNewer) {
                    return reply.send({
                        updateAvailable: false,
                        currentVersion: body.currentVersion,
                        latestVersion: latestVersion.version,
                    });
                }

                // Build download URL
                const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.hostname}`;
                const downloadUrl = `${baseUrl}/api/updates/download/${latestVersion.id}`;

                return reply.send({
                    updateAvailable: true,
                    currentVersion: body.currentVersion,
                    latestVersion: latestVersion.version,
                    downloadUrl: downloadUrl,
                    releaseNotes: latestVersion.release_notes,
                    fileSize: latestVersion.file_size,
                    checksum: latestVersion.checksum,
                    isMandatory: latestVersion.is_mandatory,
                });
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.code(400).send({
                        error: "Validation Error",
                        details: error.errors,
                    });
                }
                console.error("[Updates] Check error:", error);
                return reply.code(500).send({ error: "Internal server error" });
            }
        }
    );

    /**
     * Get latest version info for electron-updater
     * GET /api/updates/latest/:platform
     * Returns YAML format for electron-updater
     */
    fastify.get(
        "/latest/:platform",
        async (
            request: FastifyRequest<{ Params: { platform: string } }>,
            reply: FastifyReply
        ) => {
            try {
                const { platform } = request.params;

                // Map platform names
                const platformMap: Record<string, string> = {
                    "win32": "win32",
                    "darwin": "darwin",
                    "linux": "linux",
                    "mac": "darwin",
                    "win": "win32",
                };

                const dbPlatform = platformMap[platform.toLowerCase()] || platform;

                const versions = await query<AppVersion>(
                    `SELECT * FROM app_versions 
           WHERE platform = ? AND is_active = TRUE 
           ORDER BY created_at DESC 
           LIMIT 1`,
                    [dbPlatform]
                );

                if (versions.length === 0) {
                    return reply.code(404).send({ error: "No version found for this platform" });
                }

                const v = versions[0];
                const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.hostname}`;

                // Return JSON format for electron-updater (generic provider)
                return reply.send({
                    version: v.version,
                    files: [
                        {
                            url: `${baseUrl}/api/updates/download/${v.id}`,
                            sha512: v.checksum,
                            size: v.file_size,
                        },
                    ],
                    path: v.download_url,
                    sha512: v.checksum,
                    releaseNotes: v.release_notes,
                });
            } catch (error) {
                console.error("[Updates] Latest error:", error);
                return reply.code(500).send({ error: "Internal server error" });
            }
        }
    );

    /**
     * Download update file
     * GET /api/updates/download/:id
     */
    fastify.get(
        "/download/:id",
        async (
            request: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply
        ) => {
            try {
                const { id } = request.params;

                const versions = await query<AppVersion>(
                    `SELECT * FROM app_versions WHERE id = ?`,
                    [id]
                );

                if (versions.length === 0) {
                    return reply.code(404).send({ error: "Version not found" });
                }

                const version = versions[0];

                // Check if file exists locally
                const uploadsDir = process.env.UPLOADS_DIR || "./uploads/releases";
                const filePath = path.join(uploadsDir, version.download_url);

                if (fs.existsSync(filePath)) {
                    // Serve local file
                    const stream = fs.createReadStream(filePath);
                    return reply
                        .header("Content-Type", "application/octet-stream")
                        .header("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`)
                        .header("Content-Length", version.file_size)
                        .send(stream);
                }

                // If download_url is external URL, redirect
                if (version.download_url.startsWith("http")) {
                    return reply.redirect(version.download_url);
                }

                return reply.code(404).send({ error: "File not found" });
            } catch (error) {
                console.error("[Updates] Download error:", error);
                return reply.code(500).send({ error: "Internal server error" });
            }
        }
    );

    /**
     * Get all versions (for admin dashboard)
     * GET /api/updates/versions
     */
    fastify.get(
        "/versions",
        async (
            request: FastifyRequest<{ Querystring: { platform?: string } }>,
            reply: FastifyReply
        ) => {
            try {
                const { platform } = request.query;
                let sql = `SELECT * FROM app_versions ORDER BY created_at DESC`;
                const params: string[] = [];

                if (platform) {
                    sql = `SELECT * FROM app_versions WHERE platform = ? ORDER BY created_at DESC`;
                    params.push(platform);
                }

                const versions = await query<AppVersion>(sql, params);
                return reply.send({ data: versions });
            } catch (error) {
                console.error("[Updates] Versions list error:", error);
                return reply.code(500).send({ error: "Internal server error" });
            }
        }
    );

    /**
     * Create new version (for admin dashboard)
     * POST /api/updates/versions
     */
    fastify.post(
        "/versions",
        async (
            request: FastifyRequest<{
                Body: {
                    version: string;
                    platform: string;
                    download_url: string;
                    release_notes?: string;
                    file_size?: number;
                    checksum?: string;
                    is_mandatory?: boolean;
                };
            }>,
            reply: FastifyReply
        ) => {
            try {
                const { version, platform, download_url, release_notes, file_size, checksum, is_mandatory } = request.body;

                const id = crypto.randomUUID();
                await query(
                    `INSERT INTO app_versions (id, version, platform, download_url, release_notes, file_size, checksum, is_mandatory)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, version, platform, download_url, release_notes || null, file_size || 0, checksum || null, is_mandatory || false]
                );

                return reply.status(201).send({
                    id,
                    message: "تم إضافة الإصدار بنجاح",
                });
            } catch (error) {
                console.error("[Updates] Create version error:", error);
                return reply.code(500).send({ error: "Internal server error" });
            }
        }
    );

    /**
     * Delete version (for admin dashboard)
     * DELETE /api/updates/versions/:id
     */
    fastify.delete(
        "/versions/:id",
        async (
            request: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply
        ) => {
            try {
                const { id } = request.params;
                await query(`DELETE FROM app_versions WHERE id = ?`, [id]);
                return reply.send({ message: "تم حذف الإصدار بنجاح" });
            } catch (error) {
                console.error("[Updates] Delete version error:", error);
                return reply.code(500).send({ error: "Internal server error" });
            }
        }
    );
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/^v/, "").split(".").map(Number);
    const parts2 = v2.replace(/^v/, "").split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}
