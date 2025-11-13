// Electron API Types
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      getDatabasePath: () => Promise<string>;
      whatsapp: {
        initAccount: (
          accountId: string,
          accountPhone: string
        ) => Promise<{ success: boolean; status: string; message: string }>;
        getState: (accountId: string) => Promise<{
          status: string;
          qrCode?: string;
          phone?: string;
          error?: string;
        }>;
        sendText: (
          accountId: string,
          to: string,
          message: string
        ) => Promise<{ success: boolean; message: string }>;
        sendMedia: (
          accountId: string,
          to: string,
          mediaUrl: string,
          mediaType: "image" | "document" | "video",
          caption?: string,
          filename?: string
        ) => Promise<{ success: boolean; message: string }>;
        disconnect: (
          accountId: string
        ) => Promise<{ success: boolean; message: string }>;
        isConnected: (accountId: string) => Promise<boolean>;
      };
      products: any;
      customers: any;
      invoices: any;
      settings: any;
      reports: any;
    };
  }
}

export {};
