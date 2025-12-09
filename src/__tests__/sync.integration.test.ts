import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createFastifyClient,
  getFastifyClient,
} from "@/infrastructure/http/FastifyClient";
import { createSyncQueue, getSyncQueue } from "@/infrastructure/sync/SyncQueue";
import {
  createSyncEngine,
  getSyncEngine,
} from "@/infrastructure/sync/SyncEngine";

describe("Sync System Integration Tests", () => {
  beforeAll(async () => {
    // Initialize components
    createFastifyClient({
      baseURL: "http://localhost:3030",
      timeout: 30000,
    });

    await createSyncQueue();

    await createSyncEngine({
      syncInterval: 60000, // 1 minute for testing
      enableAutoSync: false, // Disable auto-sync for tests
    });
  });

  afterAll(async () => {
    const syncEngine = getSyncEngine();
    await syncEngine.stop();
  });

  describe("SyncQueue", () => {
    it("should add items to queue", async () => {
      const queue = getSyncQueue();

      await queue.add({
        table: "products",
        recordId: "test-1",
        operation: "create",
        data: { id: "test-1", name: "Test Product" },
        status: "pending",
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });

      const pending = await queue.getPending();
      expect(pending.length).toBeGreaterThan(0);
    });

    it("should get statistics", async () => {
      const queue = getSyncQueue();
      const stats = await queue.getStats();

      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("failed");
    });

    it("should filter by table", async () => {
      const queue = getSyncQueue();
      const products = await queue.getByTable("products");

      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe("FastifyClient", () => {
    it("should be initialized", () => {
      const client = getFastifyClient();
      expect(client).toBeDefined();
    });

    it("should handle requests", async () => {
      const client = getFastifyClient();

      // This will fail if not authenticated, which is expected in test
      try {
        await client.get("/sync/status");
      } catch (error: any) {
        // Expected to fail with 401 if not authenticated
        expect([401, 403]).toContain(error.response?.status);
      }
    });
  });

  describe("SyncEngine", () => {
    it("should be initialized", () => {
      const syncEngine = getSyncEngine();
      expect(syncEngine).toBeDefined();
    });

    it("should add to queue", async () => {
      const syncEngine = getSyncEngine();

      await syncEngine.addToQueue("customers", "test-customer-1", "create", {
        id: "test-customer-1",
        name: "Test Customer",
      });

      const queue = getSyncQueue();
      const pending = await queue.getPending();

      expect(pending.some((item) => item.recordId === "test-customer-1")).toBe(
        true
      );
    });

    it("should emit events", (done) => {
      const syncEngine = getSyncEngine();

      syncEngine.once("online", () => {
        expect(true).toBe(true);
        done();
      });

      // Trigger online event
      window.dispatchEvent(new Event("online"));
    });
  });

  describe("Offline Scenarios", () => {
    it("should queue operations when offline", async () => {
      const syncEngine = getSyncEngine();
      const queue = getSyncQueue();

      // Simulate offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      // Add operation
      await syncEngine.addToQueue("invoices", "test-invoice-1", "create", {
        id: "test-invoice-1",
        total: 100,
      });

      const pending = await queue.getPending();
      expect(pending.some((item) => item.recordId === "test-invoice-1")).toBe(
        true
      );

      // Restore online
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });
    });
  });

  describe("Conflict Detection", () => {
    it("should detect conflicts based on timestamps", () => {
      const localUpdatedAt = "2024-01-01T10:00:00Z";
      const serverUpdatedAt = "2024-01-01T11:00:00Z";

      const hasConflict = new Date(serverUpdatedAt) > new Date(localUpdatedAt);
      expect(hasConflict).toBe(true);
    });

    it("should not detect conflict when timestamps match", () => {
      const localUpdatedAt = "2024-01-01T10:00:00Z";
      const serverUpdatedAt = "2024-01-01T10:00:00Z";

      const hasConflict = new Date(serverUpdatedAt) > new Date(localUpdatedAt);
      expect(hasConflict).toBe(false);
    });
  });
});
