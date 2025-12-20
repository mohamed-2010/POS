/**
 * SmartSyncManager - Intelligent Bidirectional Sync System
 * 
 * Features:
 * - Automatic bidirectional sync (local ↔ server)
 * - Timestamp-based conflict resolution (Last Write Wins)
 * - Real-time updates via WebSocket
 * - Offline queue with smart merge on reconnection
 * - Multi-user support
 */

import { EventEmitter } from 'events';
import { FastifyClient } from '../http/FastifyClient';
import { WebSocketClient, ConnectionState } from '../http/WebSocketClient';
import { getDatabaseService } from '../database/DatabaseService';

// Types
export interface SyncRecord {
    id: string;
    table: string;
    data: any;
    local_updated_at: string;
    server_updated_at?: string;
    is_deleted?: boolean;
}

export interface SyncResult {
    pulled: number;
    pushed: number;
    conflicts: number;
    errors: string[];
}

export interface SyncEvent {
    table: string;
    recordId: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: string;
    sourceDeviceId: string;
    userId?: string;
}

export interface SmartSyncConfig {
    syncInterval: number;        // How often to sync (ms) - default 30s
    pullOnConnect: boolean;      // Pull changes on connect - default true
    pushOnChange: boolean;       // Push immediately on change - default true
    enableRealTime: boolean;     // Listen for WebSocket updates - default true
    batchSize: number;           // Records per batch - default 50
}

type SyncStatus = 'idle' | 'syncing' | 'pulling' | 'pushing' | 'offline' | 'error';

// Syncable tables configuration - all tables that should sync to server
const SYNCABLE_TABLES = [
    // Core products & inventory
    'products',
    'product_categories',
    'product_units',
    'units',
    'price_types',
    'warehouses',
    // People
    'customers',
    'suppliers',
    'employees',
    // Sales
    'invoices',
    'invoice_items',
    'sales_returns',
    // Purchases
    'purchases',
    'purchase_items',
    'purchase_returns',
    // Finance
    'expenses',
    'expense_categories',
    'expense_items',
    'deposits',
    'deposit_sources',
    'payments',
    'payment_methods',
    // Operations
    'shifts',
    // Settings & Audit
    'settings',
    'audit_logs',
];

// Mapping from snake_case table names to camelCase IndexedDB store names
const TABLE_TO_STORE_MAP: Record<string, string> = {
    'product_categories': 'productCategories',
    'product_units': 'productUnits',
    'price_types': 'priceTypes',
    'invoice_items': 'invoiceItems',
    'sales_returns': 'salesReturns',
    'purchase_items': 'purchaseItems',
    'purchase_returns': 'purchaseReturns',
    'expense_categories': 'expenseCategories',
    'expense_items': 'expenseItems',
    'deposit_sources': 'depositSources',
    'payment_methods': 'paymentMethods',
    'audit_logs': 'auditLogs',
};

// Helper function to get the store name from table name
function getStoreName(tableName: string): string {
    return TABLE_TO_STORE_MAP[tableName] || tableName;
}

// Helper function to get the table name from store name (reverse mapping)
function getTableName(storeName: string): string {
    const reverseMap = Object.entries(TABLE_TO_STORE_MAP).reduce((acc, [table, store]) => {
        acc[store] = table;
        return acc;
    }, {} as Record<string, string>);
    return reverseMap[storeName] || storeName;
}

export class SmartSyncManager extends EventEmitter {
    private httpClient: FastifyClient;
    private wsClient: WebSocketClient;
    private config: SmartSyncConfig;
    private status: SyncStatus = 'idle';
    private lastSyncTime: number = 0;
    private deviceId: string;
    private syncTimer: NodeJS.Timeout | null = null;
    private isOnline: boolean = navigator.onLine;

    constructor(
        httpClient: FastifyClient,
        wsClient: WebSocketClient,
        config?: Partial<SmartSyncConfig>
    ) {
        super();
        this.httpClient = httpClient;
        this.wsClient = wsClient;
        this.deviceId = this.getOrCreateDeviceId();

        this.config = {
            syncInterval: config?.syncInterval ?? 30000,      // 30 seconds
            pullOnConnect: config?.pullOnConnect ?? true,
            pushOnChange: config?.pushOnChange ?? true,
            enableRealTime: config?.enableRealTime ?? true,
            batchSize: config?.batchSize ?? 50,
        };

        this.loadLastSyncTime();
        this.setupEventListeners();
    }

    // ==================== Initialization ====================

    /**
     * Start the sync manager
     */
    async start(): Promise<void> {
        console.log('[SmartSync] Starting...');

        // Do initial full sync
        if (this.isOnline) {
            await this.performFullSync();
        }

        // Start periodic sync
        this.startPeriodicSync();

        console.log('[SmartSync] Started successfully');
    }

    /**
     * Stop the sync manager
     */
    stop(): void {
        console.log('[SmartSync] Stopping...');
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    private setupEventListeners(): void {
        // Online/Offline detection
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // WebSocket events
        this.wsClient.on('connected', () => {
            if (this.config.pullOnConnect) {
                this.pullChanges();
            }
        });

        // Real-time sync updates from other users
        if (this.config.enableRealTime) {
            this.wsClient.on('sync:update', (event: SyncEvent) => {
                this.handleRemoteUpdate(event);
            });
        }
    }

    private getOrCreateDeviceId(): string {
        const key = 'pos_device_id';
        let id = localStorage.getItem(key);
        if (!id) {
            id = `device-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
            localStorage.setItem(key, id);
        }
        return id;
    }

    private loadLastSyncTime(): void {
        const stored = localStorage.getItem('pos_last_sync_time');
        this.lastSyncTime = stored ? parseInt(stored, 10) : 0;
    }

    private saveLastSyncTime(): void {
        this.lastSyncTime = Date.now();
        localStorage.setItem('pos_last_sync_time', this.lastSyncTime.toString());
    }

    // ==================== Full Sync ====================

    /**
     * Perform a complete bidirectional sync
     */
    async performFullSync(): Promise<SyncResult> {
        console.log('[SmartSync] Performing full sync...');
        this.setStatus('syncing');

        const result: SyncResult = {
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            errors: [],
        };

        try {
            // Step 1: Pull changes from server first
            const pullResult = await this.pullChanges();
            result.pulled = pullResult.pulled;
            result.conflicts += pullResult.conflicts;
            result.errors.push(...pullResult.errors);

            // Step 2: Push local changes to server
            const pushResult = await this.pushChanges();
            result.pushed = pushResult.pushed;
            result.conflicts += pushResult.conflicts;
            result.errors.push(...pushResult.errors);

            this.saveLastSyncTime();
            this.setStatus('idle');
            this.emit('syncComplete', result);

            console.log(`[SmartSync] Full sync complete: pulled=${result.pulled}, pushed=${result.pushed}, conflicts=${result.conflicts}`);

        } catch (error: any) {
            console.error('[SmartSync] Full sync failed:', error);
            result.errors.push(error.message);
            this.setStatus('error');
            this.emit('syncError', error);
        }

        return result;
    }

    // ==================== Pull (Server → Local) ====================

    /**
     * Pull changes from server and apply to local IndexedDB
     */
    async pullChanges(): Promise<SyncResult> {
        console.log('[SmartSync] Pulling changes from server...');
        this.setStatus('pulling');

        const result: SyncResult = {
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            errors: [],
        };

        try {
            // Get the since timestamp - use ISO string
            const since = this.lastSyncTime > 0
                ? new Date(this.lastSyncTime).toISOString()
                : '1970-01-01T00:00:00.000Z';

            const response = await this.httpClient.get<{
                success?: boolean;
                changes: any[];
                has_more?: boolean;
                next_cursor?: string;
            }>(`/api/sync/pull-changes?since=${encodeURIComponent(since)}&tables=${SYNCABLE_TABLES.join(',')}`);

            // Normalize response format - convert array to object keyed by table
            const changesObj: Record<string, any[]> = {};
            if (Array.isArray(response.changes)) {
                for (const change of response.changes) {
                    const table = change.table_name;
                    if (!changesObj[table]) {
                        changesObj[table] = [];
                    }
                    changesObj[table].push(change.data || change);
                }
            } else if (response.changes) {
                Object.assign(changesObj, response.changes);
            }

            // Apply each table's changes to local IndexedDB
            for (const [tableName, records] of Object.entries(changesObj)) {
                for (const record of records) {
                    await this.applyServerRecord(tableName, record);
                    result.pulled++;
                }
            }

            // Note: conflicts are handled during push, not pull

            console.log(`[SmartSync] Pulled ${result.pulled} records`);

        } catch (error: any) {
            console.error('[SmartSync] Pull failed:', error);
            result.errors.push(error.message);
        }

        this.setStatus('idle');
        return result;
    }

    /**
     * Apply a server record to local IndexedDB
     */
    private async applyServerRecord(tableName: string, record: any): Promise<void> {
        const db = getDatabaseService();
        const storeName = getStoreName(tableName);
        const repo = db.getRepository(storeName);

        try {
            const localRecord = await repo.getById(record.id);

            if (record.is_deleted) {
                // Handle deletion
                if (localRecord) {
                    await repo.deleteFromServer(record.id);
                }
                return;
            }

            if (!localRecord) {
                // New record from server - insert locally
                await repo.createFromServer(record);
            } else {
                // Existing record - compare timestamps
                const shouldUpdate = this.shouldApplyServerUpdate(localRecord, record);
                if (shouldUpdate) {
                    await repo.updateFromServer(record.id, record);
                }
            }
        } catch (error) {
            console.error(`[SmartSync] Failed to apply server record to ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Determine if server record is newer than local
     */
    private shouldApplyServerUpdate(local: any, server: any): boolean {
        const localTime = new Date(local.local_updated_at || local.updatedAt || 0).getTime();
        const serverTime = new Date(server.server_updated_at || server.updated_at || 0).getTime();

        // Server is newer → apply update
        return serverTime > localTime;
    }

    // ==================== Push (Local → Server) ====================

    /**
     * Push local changes to server
     */
    async pushChanges(): Promise<SyncResult> {
        console.log('[SmartSync] Pushing local changes to server...');
        this.setStatus('pushing');

        const result: SyncResult = {
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            errors: [],
        };

        try {
            const db = getDatabaseService();

            // Get all unsynced records from all tables
            const unsyncedRecords: Array<{ table: string; record: any }> = [];

            for (const tableName of SYNCABLE_TABLES) {
                try {
                    const storeName = getStoreName(tableName);
                    const repo = db.getRepository(storeName);
                    const unsynced = await repo.getUnsyncedRecords();

                    for (const record of unsynced) {
                        unsyncedRecords.push({ table: tableName, record });
                    }
                } catch (e) {
                    // Table might not exist locally
                    console.warn(`[SmartSync] Could not get unsynced records for ${tableName}`);
                }
            }

            if (unsyncedRecords.length === 0) {
                console.log('[SmartSync] No local changes to push');
                this.setStatus('idle');
                return result;
            }

            console.log(`[SmartSync] Found ${unsyncedRecords.length} unsynced records`);

            // Send in batches
            const batches = this.createBatches(unsyncedRecords, this.config.batchSize);

            for (const batch of batches) {
                const batchResult = await this.pushBatch(batch);
                result.pushed += batchResult.pushed;
                result.conflicts += batchResult.conflicts;
                result.errors.push(...batchResult.errors);
            }

            console.log(`[SmartSync] Pushed ${result.pushed} records`);

        } catch (error: any) {
            console.error('[SmartSync] Push failed:', error);
            result.errors.push(error.message);
        }

        this.setStatus('idle');
        return result;
    }

    /**
     * Push a batch of records to server
     */
    private async pushBatch(records: Array<{ table: string; record: any }>): Promise<SyncResult> {
        const result: SyncResult = {
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            errors: [],
        };

        const requestRecords = records.map(({ table, record }) => {
            // Settings table uses 'key' as primary key, others use 'id'
            let recordId: string;
            if (table === 'settings') {
                recordId = record.key || record.id || `settings-${Date.now()}`;
            } else {
                recordId = record.id;
            }

            return {
                table_name: table,
                record_id: recordId,
                data: record,
                local_updated_at: record.local_updated_at || new Date().toISOString(),
                is_deleted: record.is_deleted || false,
            };
        });

        try {
            const response = await this.httpClient.post<{
                success: boolean;
                synced_count: number;
                errors: Array<{ table_name: string; record_id: string; error: string }>;
                conflicts: any[];
            }>('/api/sync/batch-push', {
                device_id: this.deviceId,
                records: requestRecords,
            });

            result.pushed = response.synced_count || 0;

            // Mark successfully synced records
            const db = getDatabaseService();
            const errorSet = new Set(
                (response.errors || []).map(e => `${e.table_name}:${e.record_id}`)
            );

            for (const { table, record } of records) {
                // Settings table uses 'key' as primary key
                const recordKey = table === 'settings' ? (record.key || record.id) : record.id;
                const errorKey = `${table}:${recordKey}`;
                if (!errorSet.has(errorKey)) {
                    // Mark as synced
                    try {
                        const storeName = getStoreName(table);
                        const repo = db.getRepository(storeName);
                        await repo.markAsSynced(recordKey);
                    } catch (e) {
                        console.warn(`[SmartSync] Could not mark ${table}:${recordKey} as synced`);
                    }
                }
            }

            // Handle errors
            if (response.errors) {
                for (const err of response.errors) {
                    result.errors.push(`${err.table_name}:${err.record_id} - ${err.error}`);
                }
            }

            // Handle conflicts
            if (response.conflicts) {
                result.conflicts = response.conflicts.length;
                for (const conflict of response.conflicts) {
                    await this.resolveConflict(conflict);
                }
            }

        } catch (error: any) {
            result.errors.push(error.message);
        }

        return result;
    }

    // ==================== Real-time Updates ====================

    /**
     * Handle real-time update from another user/device
     */
    private async handleRemoteUpdate(event: SyncEvent): Promise<void> {
        // Skip if we are the source of this update
        if (event.sourceDeviceId === this.deviceId) {
            return;
        }

        console.log(`[SmartSync] Remote update received: ${event.table}/${event.recordId} (${event.operation})`);

        try {
            const db = getDatabaseService();
            const storeName = getStoreName(event.table);
            const repo = db.getRepository(storeName);

            switch (event.operation) {
                case 'create':
                case 'update':
                    await repo.updateFromServer(event.recordId, event.data);
                    break;
                case 'delete':
                    await repo.deleteFromServer(event.recordId);
                    break;
            }

            // Emit event for UI refresh
            this.emit('remoteUpdate', {
                table: event.table,
                recordId: event.recordId,
                operation: event.operation,
            });

        } catch (error) {
            console.error('[SmartSync] Failed to apply remote update:', error);
        }
    }

    /**
     * Notify server of a local change (for broadcasting to other users)
     */
    async notifyLocalChange(
        table: string,
        recordId: string,
        operation: 'create' | 'update' | 'delete',
        data: any
    ): Promise<void> {
        if (!this.isOnline) return;

        // Send via WebSocket for real-time broadcast
        this.wsClient.send({
            type: 'sync:change',
            payload: {
                table,
                recordId,
                operation,
                data,
                timestamp: new Date().toISOString(),
                sourceDeviceId: this.deviceId,
            }
        });

        // Also push to server via HTTP
        if (this.config.pushOnChange) {
            const result = await this.pushBatch([{ table, record: data }]);
            if (result.errors.length > 0) {
                console.warn('[SmartSync] Push on change failed:', result.errors);
            }
        }
    }

    // ==================== Conflict Resolution ====================

    /**
     * Resolve a sync conflict using Last Write Wins
     * Conflict structure from server:
     * { table_name, record_id, local_data, server_data, local_updated_at, server_updated_at }
     */
    private async resolveConflict(conflict: any): Promise<void> {
        const { table_name, record_id, local_updated_at, server_updated_at } = conflict;

        const localTime = new Date(local_updated_at || 0).getTime();
        const serverTime = new Date(server_updated_at || 0).getTime();

        console.log(`[SmartSync] Resolving conflict for ${table_name}/${record_id}: local=${localTime}, server=${serverTime}`);

        const db = getDatabaseService();
        const storeName = getStoreName(table_name);

        try {
            if (serverTime >= localTime) {
                // Server wins - mark local record as synced (don't re-push)
                const repo = db.getRepository(storeName);
                await repo.markAsSynced(record_id);
                console.log(`[SmartSync] Conflict resolved: Server wins, marked ${table_name}/${record_id} as synced`);
            } else {
                // Local wins - will be pushed in next sync cycle
                console.log(`[SmartSync] Conflict resolved: Local wins (will push)`);
            }
        } catch (e) {
            console.warn(`[SmartSync] Could not resolve conflict for ${table_name}/${record_id}:`, e);
        }
    }

    // ==================== Online/Offline ====================

    private handleOnline(): void {
        console.log('[SmartSync] Back online');
        this.isOnline = true;
        this.setStatus('idle');

        // Perform full sync when back online
        this.performFullSync();

        this.emit('online');
    }

    private handleOffline(): void {
        console.log('[SmartSync] Gone offline');
        this.isOnline = false;
        this.setStatus('offline');
        this.emit('offline');
    }

    // ==================== Helpers ====================

    private startPeriodicSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            if (this.isOnline && this.status === 'idle') {
                this.performFullSync();
            }
        }, this.config.syncInterval);
    }

    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    private setStatus(status: SyncStatus): void {
        if (this.status !== status) {
            this.status = status;
            this.emit('statusChange', status);
        }
    }

    // ==================== Public API ====================

    getStatus(): SyncStatus {
        return this.status;
    }

    getLastSyncTime(): number {
        return this.lastSyncTime;
    }

    isConnected(): boolean {
        return this.isOnline;
    }

    getDeviceId(): string {
        return this.deviceId;
    }
}

// ==================== Singleton ====================

let smartSyncInstance: SmartSyncManager | null = null;

export function initializeSmartSync(
    httpClient: FastifyClient,
    wsClient: WebSocketClient,
    config?: Partial<SmartSyncConfig>
): SmartSyncManager {
    smartSyncInstance = new SmartSyncManager(httpClient, wsClient, config);
    return smartSyncInstance;
}

export function getSmartSync(): SmartSyncManager {
    if (!smartSyncInstance) {
        throw new Error('SmartSyncManager not initialized. Call initializeSmartSync first.');
    }
    return smartSyncInstance;
}
