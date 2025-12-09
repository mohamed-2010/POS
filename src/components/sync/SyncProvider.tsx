import { useEffect } from "react";
import React from "react";
import { useConflictResolution } from "@/hooks/useConflictResolution";
import { ConflictResolutionDialog } from "@/components/sync/ConflictResolutionDialog";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import {
  initializeInfrastructure,
  shutdownInfrastructure,
} from "@/infrastructure";

/**
 * SyncProvider - Component to initialize sync system and handle conflicts
 *
 * Usage:
 * ```tsx
 * <SyncProvider>
 *   <App />
 * </SyncProvider>
 * ```
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  // Initialize infrastructure on mount
  useEffect(() => {
    let isInitialized = false;

    const init = async () => {
      try {
        // Get configuration from environment variables
        const apiBaseURL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3030";
        const wsURL = import.meta.env.VITE_WS_URL || "ws://localhost:3031";
        const syncInterval =
          Number(import.meta.env.VITE_SYNC_INTERVAL) || 5 * 60 * 1000;

        await initializeInfrastructure({
          apiBaseURL,
          wsURL,
          enableSync: true,
          syncInterval,
        });

        isInitialized = true;
        console.log("✅ Sync system initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize sync system:", error);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      if (isInitialized) {
        shutdownInfrastructure();
      }
    };
  }, []);

  // Setup conflict resolution
  const { currentConflict, isDialogOpen, handleResolve, handleCloseDialog } =
    useConflictResolution({
      // Auto-resolve with server data by default
      // Change to 'none' to show dialog for each conflict
      autoResolve: "server",
    });

  return (
    <>
      {children}

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        conflict={currentConflict}
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onResolve={handleResolve}
      />
    </>
  );
}

/**
 * useSyncStatus - Hook to access sync status in components
 */
export function useSyncStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, isSyncing };
}

// Re-export components for convenience
export { SyncStatusIndicator, ConflictResolutionDialog };
