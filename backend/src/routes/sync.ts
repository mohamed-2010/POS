import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  syncService,
  SyncBatchRequest,
  PullChangesRequest,
} from "../services/SyncService.js";
import { logger } from "../config/logger.js";

interface BatchPushBody {
  device_id: string;
  records: Array<{
    table_name: string;
    record_id: string;
    data: Record<string, any>;
    local_updated_at: string;
    is_deleted: boolean;
  }>;
}

interface PullChangesQuery {
  since: string;
  tables?: string;
}

interface ResolveConflictBody {
  table_name: string;
  record_id: string;
  resolution: "accept_server" | "accept_client";
  client_data?: Record<string, any>;
}

export async function syncRoutes(server: FastifyInstance) {
  /**
   * POST /api/sync/batch-push
   * دفع batch من التغييرات من الـ client للسيرفر
   */
  server.post<{ Body: BatchPushBody }>(
    "/batch-push",
    {
      preHandler: [server.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["device_id", "records"],
          properties: {
            device_id: { type: "string" },
            records: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "table_name",
                  "record_id",
                  "data",
                  "local_updated_at",
                  "is_deleted",
                ],
                properties: {
                  table_name: { type: "string" },
                  record_id: { type: "string" },
                  data: { type: "object" },
                  local_updated_at: { type: "string" },
                  is_deleted: { type: "boolean" },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              synced_count: { type: "number" },
              conflicts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    table_name: { type: "string" },
                    record_id: { type: "string" },
                    local_data: { type: "object" },
                    server_data: { type: "object" },
                    local_updated_at: { type: "string" },
                    server_updated_at: { type: "string" },
                  },
                },
              },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    table_name: { type: "string" },
                    record_id: { type: "string" },
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: BatchPushBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { device_id, records } = request.body;
        const { userId, clientId, branchId } = request.user!;

        logger.info(
          {
            user_id: userId,
            client_id: clientId,
            branch_id: branchId,
            device_id,
            record_count: records.length,
          },
          "Sync batch push request"
        );

        const syncRequest: SyncBatchRequest = {
          client_id: clientId as any, // Keep as string UUID
          branch_id: branchId as any, // Keep as string UUID
          device_id,
          records,
        };

        const result = await syncService.processBatch(syncRequest);

        return reply.code(200).send(result);
      } catch (error) {
        logger.error({ error }, "Batch push failed");
        return reply.code(500).send({
          error: "Sync failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * GET /api/sync/pull-changes
   * سحب التغييرات من السيرفر منذ timestamp معين
   */
  server.get<{ Querystring: PullChangesQuery }>(
    "/pull-changes",
    {
      // Unprotected in dev so clients can sync without a token
      preHandler: [],
      schema: {
        querystring: {
          type: "object",
          required: ["since"],
          properties: {
            since: { type: "string", format: "date-time" },
            tables: { type: "string" }, // comma-separated table names
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    table_name: { type: "string" },
                    record_id: { type: "string" },
                    data: { type: "object" },
                    server_updated_at: { type: "string" },
                    is_deleted: { type: "boolean" },
                  },
                },
              },
              has_more: { type: "boolean" },
              next_cursor: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: PullChangesQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { since, tables } = request.query;
        const clientId = Number(request.user?.clientId ?? 1);
        const branchId = Number(request.user?.branchId ?? 1);
        const userId = request.user?.userId ?? 0;

        logger.info(
          {
            user_id: userId,
            client_id: clientId,
            branch_id: branchId,
            since,
            tables,
          },
          "Pull changes request"
        );

        const pullRequest: PullChangesRequest = {
          client_id: clientId,
          branch_id: branchId,
          since,
          tables: tables ? tables.split(",") : undefined,
        };

        const result = await syncService.pullChanges(pullRequest);

        return reply.code(200).send(result);
      } catch (error) {
        logger.error({ error }, "Pull changes failed");
        return reply.code(500).send({
          error: "Pull failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /api/sync/resolve-conflict
   * حل conflict بين نسخة client وserver
   */
  server.post<{ Body: ResolveConflictBody }>(
    "/resolve-conflict",
    {
      preHandler: [server.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["table_name", "record_id", "resolution"],
          properties: {
            table_name: { type: "string" },
            record_id: { type: "string" },
            resolution: {
              type: "string",
              enum: ["accept_server", "accept_client"],
            },
            client_data: { type: "object" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: ResolveConflictBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { table_name, record_id, resolution, client_data } = request.body;
        const { userId, clientId, branchId } = request.user!;

        logger.info(
          {
            user_id: userId,
            client_id: clientId,
            branch_id: branchId,
            table_name,
            record_id,
            resolution,
          },
          "Resolve conflict request"
        );

        if (resolution === "accept_client" && !client_data) {
          return reply.code(400).send({
            error: "Bad Request",
            message: "client_data is required when accepting client version",
          });
        }

        await syncService.resolveConflict(
          Number(clientId),
          Number(branchId),
          table_name,
          record_id,
          resolution,
          client_data
        );

        return reply.code(200).send({
          success: true,
          message: `Conflict resolved with ${resolution}`,
        });
      } catch (error) {
        logger.error({ error }, "Resolve conflict failed");
        return reply.code(500).send({
          error: "Resolution failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * GET /api/sync/stats
   * الحصول على إحصائيات الـ sync للعميل والفرع
   */
  server.get(
    "/stats",
    {
      preHandler: [server.authenticate],
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              pending_queue_count: { type: "number" },
              last_sync_at: { type: ["string", "null"] },
              tables_stats: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    table_name: { type: "string" },
                    record_count: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId, clientId, branchId } = request.user!;

        logger.info(
          {
            user_id: userId,
            client_id: clientId,
            branch_id: branchId,
          },
          "Sync stats request"
        );

        const stats = await syncService.getSyncStats(
          Number(clientId),
          Number(branchId)
        );

        return reply.code(200).send(stats);
      } catch (error) {
        logger.error({ error }, "Get sync stats failed");
        return reply.code(500).send({
          error: "Stats retrieval failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
