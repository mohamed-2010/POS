import { contextBridge, ipcRenderer } from "electron";

// تعريض API آمنة للـ renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // معلومات التطبيق
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),

  // WhatsApp APIs
  whatsapp: {
    initAccount: (accountId: string, accountPhone: string) =>
      ipcRenderer.invoke("whatsapp:init-account", accountId, accountPhone),
    getState: (accountId: string) =>
      ipcRenderer.invoke("whatsapp:get-state", accountId),
    sendText: (accountId: string, to: string, message: string) =>
      ipcRenderer.invoke("whatsapp:send-text", accountId, to, message),
    sendMedia: (
      accountId: string,
      to: string,
      mediaUrl: string,
      mediaType: "image" | "document" | "video",
      caption?: string,
      filename?: string
    ) =>
      ipcRenderer.invoke(
        "whatsapp:send-media",
        accountId,
        to,
        mediaUrl,
        mediaType,
        caption,
        filename
      ),
    disconnect: (accountId: string) =>
      ipcRenderer.invoke("whatsapp:disconnect", accountId),
    isConnected: (accountId: string) =>
      ipcRenderer.invoke("whatsapp:is-connected", accountId),
  },

  // Printer APIs
  printer: {
    getPrinters: () => ipcRenderer.invoke("printer:get-printers"),
    print: (html: string, options: any) =>
      ipcRenderer.invoke("printer:print-thermal", html, options),
  },
});

// تعريف الأنواع لـ TypeScript
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
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
      printer: {
        getPrinters: () => Promise<
          Array<{
            name: string;
            displayName: string;
            description?: string;
            status?: number;
            isDefault?: boolean;
            options?: any;
          }>
        >;
        print: (html: string, options: any) => Promise<void>;
      };
    };
  }
}
