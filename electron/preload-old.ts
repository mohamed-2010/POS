import { contextBridge, ipcRenderer } from "electron";

// تعريض API آمنة للـ renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // معلومات التطبيق
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getDatabasePath: () => ipcRenderer.invoke("get-database-path"),

  // Products API
  products: {
    getAll: () => ipcRenderer.invoke("products:getAll"),
    getById: (id: number) => ipcRenderer.invoke("products:getById", id),
    getByBarcode: (barcode: string) =>
      ipcRenderer.invoke("products:getByBarcode", barcode),
    search: (searchTerm: string) =>
      ipcRenderer.invoke("products:search", searchTerm),
    create: (product: any) => ipcRenderer.invoke("products:create", product),
    update: (id: number, product: any) =>
      ipcRenderer.invoke("products:update", id, product),
    delete: (id: number) => ipcRenderer.invoke("products:delete", id),
  },

  // Customers API
  customers: {
    getAll: () => ipcRenderer.invoke("customers:getAll"),
    getById: (id: number) => ipcRenderer.invoke("customers:getById", id),
    search: (searchTerm: string) =>
      ipcRenderer.invoke("customers:search", searchTerm),
    create: (customer: any) => ipcRenderer.invoke("customers:create", customer),
    update: (id: number, customer: any) =>
      ipcRenderer.invoke("customers:update", id, customer),
    delete: (id: number) => ipcRenderer.invoke("customers:delete", id),
  },

  // Invoices API
  invoices: {
    getAll: (limit?: number) => ipcRenderer.invoke("invoices:getAll", limit),
    getById: (id: number) => ipcRenderer.invoke("invoices:getById", id),
    create: (invoice: any, items: any[]) =>
      ipcRenderer.invoke("invoices:create", invoice, items),
    cancel: (id: number) => ipcRenderer.invoke("invoices:cancel", id),
  },

  // Settings API
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("settings:set", key, value),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
  },

  // Reports API
  reports: {
    dailySales: (date: string) =>
      ipcRenderer.invoke("reports:dailySales", date),
    topSellingProducts: (
      limit?: number,
      startDate?: string,
      endDate?: string
    ) =>
      ipcRenderer.invoke(
        "reports:topSellingProducts",
        limit,
        startDate,
        endDate
      ),
    lowStockProducts: () => ipcRenderer.invoke("reports:lowStockProducts"),
  },
});

// تعريف الأنواع لـ TypeScript
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
      getDatabasePath: () => Promise<string>;
      products: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        getByBarcode: (barcode: string) => Promise<any>;
        search: (searchTerm: string) => Promise<any>;
        create: (product: any) => Promise<any>;
        update: (id: number, product: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      customers: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        search: (searchTerm: string) => Promise<any>;
        create: (customer: any) => Promise<any>;
        update: (id: number, customer: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      invoices: {
        getAll: (limit?: number) => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (invoice: any, items: any[]) => Promise<any>;
        cancel: (id: number) => Promise<any>;
      };
      settings: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<any>;
        getAll: () => Promise<any>;
      };
      reports: {
        dailySales: (date: string) => Promise<any>;
        topSellingProducts: (
          limit?: number,
          startDate?: string,
          endDate?: string
        ) => Promise<any>;
        lowStockProducts: () => Promise<any>;
      };
    };
  }
}
