// Hook لاستخدام Electron APIs في مكونات React

import { useEffect, useState } from "react";

export function useElectronAPI() {
  const [isElectron, setIsElectron] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  const [dbPath, setDbPath] = useState<string>("");

  useEffect(() => {
    // تحقق من وجود Electron API
    if (window.electronAPI) {
      setIsElectron(true);

      // احصل على نسخة التطبيق
      window.electronAPI.getAppVersion().then((version) => {
        setAppVersion(version);
      });

      // احصل على مسار قاعدة البيانات
      window.electronAPI.getDatabasePath().then((path) => {
        setDbPath(path);
      });
    }
  }, []);

  return {
    isElectron,
    appVersion,
    dbPath,
    api: window.electronAPI,
  };
}

// Hook للمنتجات
export function useProducts() {
  const { api, isElectron } = useElectronAPI();

  const getAll = async () => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.getAll();
  };

  const getById = async (id: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.getById(id);
  };

  const getByBarcode = async (barcode: string) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.getByBarcode(barcode);
  };

  const search = async (searchTerm: string) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.search(searchTerm);
  };

  const create = async (product: any) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.create(product);
  };

  const update = async (id: number, product: any) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.update(id, product);
  };

  const deleteProduct = async (id: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.products.delete(id);
  };

  return {
    getAll,
    getById,
    getByBarcode,
    search,
    create,
    update,
    delete: deleteProduct,
  };
}

// Hook للعملاء
export function useCustomers() {
  const { api, isElectron } = useElectronAPI();

  const getAll = async () => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.customers.getAll();
  };

  const getById = async (id: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.customers.getById(id);
  };

  const search = async (searchTerm: string) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.customers.search(searchTerm);
  };

  const create = async (customer: any) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.customers.create(customer);
  };

  const update = async (id: number, customer: any) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.customers.update(id, customer);
  };

  const deleteCustomer = async (id: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.customers.delete(id);
  };

  return {
    getAll,
    getById,
    search,
    create,
    update,
    delete: deleteCustomer,
  };
}

// Hook للفواتير
export function useInvoices() {
  const { api, isElectron } = useElectronAPI();

  const getAll = async (limit?: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.invoices.getAll(limit);
  };

  const getById = async (id: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.invoices.getById(id);
  };

  const create = async (invoice: any, items: any[]) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.invoices.create(invoice, items);
  };

  const cancel = async (id: number) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.invoices.cancel(id);
  };

  return {
    getAll,
    getById,
    create,
    cancel,
  };
}

// Hook للإعدادات
export function useSettings() {
  const { api, isElectron } = useElectronAPI();

  const get = async (key: string) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.settings.get(key);
  };

  const set = async (key: string, value: string) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.settings.set(key, value);
  };

  const getAll = async () => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.settings.getAll();
  };

  return {
    get,
    set,
    getAll,
  };
}

// Hook للتقارير
export function useReports() {
  const { api, isElectron } = useElectronAPI();

  const dailySales = async (date: string) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.reports.dailySales(date);
  };

  const topSellingProducts = async (
    limit?: number,
    startDate?: string,
    endDate?: string
  ) => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.reports.topSellingProducts(limit, startDate, endDate);
  };

  const lowStockProducts = async () => {
    if (!isElectron || !api)
      return { success: false, error: "Electron not available" };
    return await api.reports.lowStockProducts();
  };

  return {
    dailySales,
    topSellingProducts,
    lowStockProducts,
  };
}

// مثال على مكون يستخدم Electron API
export function ElectronInfo() {
  const { isElectron, appVersion, dbPath } = useElectronAPI();

  if (!isElectron) {
    return (
      <div className="p-4 bg-yellow-100 rounded border border-yellow-300">
        <p className="text-sm">
          ⚠️ التطبيق يعمل في المتصفح - قاعدة البيانات غير متاحة
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-100 rounded border border-green-300">
      <h3 className="font-bold text-green-800 mb-2">✓ معلومات التطبيق</h3>
      <div className="text-sm text-green-700 space-y-1">
        <p>النسخة: {appVersion}</p>
        <p className="text-xs break-all">قاعدة البيانات: {dbPath}</p>
      </div>
    </div>
  );
}

// Note: Window.electronAPI types are defined in src/types/electron.d.ts

export {};
