import { SyncEngine } from "./SyncEngine";
import { getDatabaseService } from "../database/DatabaseService";

/**
 * ServerSyncHandler - Handles incoming sync updates from the server
 * 
 * Listens to SyncEngine events and updates local IndexedDB without triggering circular sync
 */
export class ServerSyncHandler {
    private syncEngine: SyncEngine;

    constructor(syncEngine: SyncEngine) {
        this.syncEngine = syncEngine;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Handle batch of changes from server
        this.syncEngine.on("serverChanges", (changes: any[]) => {
            this.handleServerChanges(changes);
        });

        // Handle real-time update from WebSocket
        this.syncEngine.on("remoteUpdate", (data: any) => {
            this.handleRemoteUpdate(data);
        });

        // Handle real-time delete from WebSocket
        this.syncEngine.on("remoteDelete", (data: any) => {
            this.handleRemoteDelete(data);
        });
    }

    private async handleServerChanges(changes: any[]): Promise<void> {
        console.log(`ServerSyncHandler: Processing ${changes.length} changes from server`);

        const dbService = getDatabaseService();

        for (const change of changes) {
            try {
                const repository = dbService.getRepository(change.table_name);

                if (change.is_deleted) {
                    // Delete record
                    await repository.deleteFromServer(change.record_id);
                    console.log(`Deleted from server: ${change.table_name}#${change.record_id}`);
                } else {
                    // Update or create record
                    await repository.updateFromServer(change.data);
                    console.log(`Updated from server: ${change.table_name}#${change.record_id}`);
                }
            } catch (error) {
                console.error(
                    `Failed to apply server change for ${change.table_name}#${change.record_id}:`,
                    error
                );
            }
        }
    }

    private async handleRemoteUpdate(data: any): Promise<void> {
        const { table_name, record_id, data: recordData } = data;

        console.log(`ServerSyncHandler: Remote update for ${table_name}#${record_id}`);

        try {
            const dbService = getDatabaseService();
            const repository = dbService.getRepository(table_name);
            await repository.updateFromServer(recordData);
        } catch (error) {
            console.error(`Failed to handle remote update for ${table_name}#${record_id}:`, error);
        }
    }

    private async handleRemoteDelete(data: any): Promise<void> {
        const { table_name, record_id } = data;

        console.log(`ServerSyncHandler: Remote delete for ${table_name}#${record_id}`);

        try {
            const dbService = getDatabaseService();
            const repository = dbService.getRepository(table_name);
            await repository.deleteFromServer(record_id);
        } catch (error) {
            console.error(`Failed to handle remote delete for ${table_name}#${record_id}:`, error);
        }
    }

    public destroy(): void {
        // Remove all event listeners
        this.syncEngine.removeAllListeners("serverChanges");
        this.syncEngine.removeAllListeners("remoteUpdate");
        this.syncEngine.removeAllListeners("remoteDelete");
    }
}

// Singleton instance
let serverSyncHandlerInstance: ServerSyncHandler | null = null;

export function createServerSyncHandler(syncEngine: SyncEngine): ServerSyncHandler {
    serverSyncHandlerInstance = new ServerSyncHandler(syncEngine);
    return serverSyncHandlerInstance;
}

export function getServerSyncHandler(): ServerSyncHandler | null {
    return serverSyncHandlerInstance;
}
