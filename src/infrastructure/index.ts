import {
  createFastifyClient,
  createWebSocketClient,
  getFastifyClient,
  getWebSocketClient,
} from "./http";
import {
  createSyncQueue,
  createSyncEngine,
  getSyncEngine,
  createServerSyncHandler,
  initializeSmartSync,
  getSmartSync,
} from "./sync";

export interface InfrastructureConfig {
  apiBaseURL: string;
  wsURL: string;
  enableSync?: boolean;
  syncInterval?: number;
}

let isInitialized = false;

export async function initializeInfrastructure(
  config: InfrastructureConfig
): Promise<void> {
  if (isInitialized) {
    console.warn("Infrastructure already initialized");
    return;
  }

  console.log("Initializing infrastructure...");

  try {
    // Initialize HTTP client
    const httpClient = createFastifyClient({
      baseURL: config.apiBaseURL,
      timeout: 30000,
    });

    // Load stored auth tokens
    httpClient.loadAuth();

    // Quick connectivity check (non-blocking)
    httpClient
      .get("/api/health")
      .then(() => console.log("HTTP healthcheck: backend reachable"))
      .catch((err) => console.warn("HTTP healthcheck failed:", err?.message));

    // Initialize WebSocket client
    const wsClient = createWebSocketClient({
      url: config.wsURL,
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      heartbeatInterval: 30000,
    });

    // Set auth token for WebSocket if authenticated
    if (httpClient.isAuthenticated()) {
      // Get token and set for WebSocket
      // Note: You'll need to expose a method to get the current token
      wsClient.connect();
    }

    // Initialize Sync Queue
    await createSyncQueue();

    // Initialize Sync Engine
    if (config.enableSync !== false) {
      const syncEngine = await createSyncEngine({
        syncInterval: config.syncInterval || 5 * 60 * 1000,
        enableAutoSync: true,
      });

      // Setup sync engine event listeners
      syncEngine.on("started", () => {
        console.log("Sync engine started");
      });

      syncEngine.on("syncComplete", (stats) => {
        console.log("Sync completed:", stats);
      });

      syncEngine.on("syncError", (error) => {
        console.error("Sync error:", error);
      });

      syncEngine.on("online", () => {
        console.log("App is online");
      });

      syncEngine.on("offline", () => {
        console.log("App is offline");
      });

      // Start sync engine even if not authenticated (API may allow public sync/ping)
      await syncEngine.start();

      // Initialize ServerSyncHandler to handle incoming server updates
      createServerSyncHandler(syncEngine);
      console.log("ServerSyncHandler initialized");

      // Initialize Smart Sync Manager for bidirectional sync
      const smartSync = initializeSmartSync(httpClient, wsClient, {
        syncInterval: config.syncInterval || 30000, // 30 seconds
        pullOnConnect: true,
        pushOnChange: true,
        enableRealTime: true,
        batchSize: 50,
      });

      // Setup SmartSync event listeners
      smartSync.on('syncComplete', (result) => {
        console.log('[SmartSync] Sync complete:', result);
      });

      smartSync.on('syncError', (error) => {
        console.error('[SmartSync] Sync error:', error);
      });

      smartSync.on('remoteUpdate', (event) => {
        console.log('[SmartSync] Remote update received:', event);
      });

      smartSync.on('online', () => {
        console.log('[SmartSync] App is online');
      });

      smartSync.on('offline', () => {
        console.log('[SmartSync] App is offline');
      });

      // Start SmartSync (initial full sync + periodic sync)
      await smartSync.start();
      console.log('SmartSyncManager initialized and started');
    }

    isInitialized = true;
    console.log("Infrastructure initialized successfully");
  } catch (error) {
    console.error("Failed to initialize infrastructure:", error);
    throw error;
  }
}

export async function shutdownInfrastructure(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  console.log("Shutting down infrastructure...");

  try {
    const syncEngine = getSyncEngine();
    await syncEngine.stop();

    const wsClient = getWebSocketClient();
    wsClient.disconnect();

    isInitialized = false;
    console.log("Infrastructure shut down successfully");
  } catch (error) {
    console.error("Error during infrastructure shutdown:", error);
  }
}

export function isInfrastructureInitialized(): boolean {
  return isInitialized;
}

// Re-export for convenience
export { getFastifyClient, getWebSocketClient } from "./http";
export { getSyncEngine, getSyncQueue } from "./sync";
export * from "./http";
export * from "./sync";
