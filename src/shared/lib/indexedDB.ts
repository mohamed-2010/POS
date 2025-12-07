import {
  getDatabaseService,
  initializeDatabase,
} from "@/infrastructure/database/DatabaseService";

/**
 * Legacy IndexedDBService wrapper for backward compatibility
 * This provides the same interface as the old IndexedDBService
 * but uses the new Clean Architecture implementation under the hood
 */
class IndexedDBService {
  private get service() {
    return getDatabaseService();
  }

  async init(): Promise<void> {
    await initializeDatabase();
  }

  async resetDatabase(): Promise<void> {
    await this.service.reset();
  }

  async add<T>(storeName: string, data: T): Promise<void> {
    const repo = this.service.getRepository<T>(storeName);
    return repo.add(data);
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    const repo = this.service.getRepository<T>(storeName);
    return repo.update(data);
  }

  async delete(storeName: string, id: string): Promise<void> {
    const repo = this.service.getRepository(storeName);
    return repo.delete(id);
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const repo = this.service.getRepository<T>(storeName);
    return repo.get(id);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const repo = this.service.getRepository<T>(storeName);
    return repo.getAll();
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    const repo = this.service.getRepository<T>(storeName);
    return repo.getByIndex(indexName, value);
  }

  async clear(storeName: string): Promise<void> {
    const repo = this.service.getRepository(storeName);
    return repo.clear();
  }

  // Legacy methods that are now handled by seeders
  async initDefaultData(): Promise<void> {
    // Data is now seeded automatically during initialization
    console.log("ℹ️  initDefaultData is now handled by seeders");
  }

  async initializeDefaultRoles(): Promise<void> {
    // Roles are now seeded automatically during initialization
    console.log("ℹ️  initializeDefaultRoles is now handled by seeders");
  }

  async migrateRolesPermissions(): Promise<void> {
    // Handled by migrations
    console.log("ℹ️  migrateRolesPermissions is now handled by migrations");
  }

  async migrateToV12(): Promise<void> {
    // Handled by migrations
    console.log("ℹ️  migrateToV12 is now handled by migrations");
  }

  // Domain-specific methods (these should eventually move to services)
  async isCategoryNameExists(
    nameAr: string,
    excludeId?: string
  ): Promise<boolean> {
    const repo = this.service.getRepository("productCategories");
    const categories = await repo.getAll();
    return categories.some(
      (cat: any) =>
        cat.nameAr.toLowerCase() === nameAr.toLowerCase() &&
        cat.id !== excludeId
    );
  }

  async getProductsByCategory(categoryName: string): Promise<any[]> {
    const repo = this.service.getRepository("products");
    const products = await repo.getAll();
    return products.filter((product: any) => product.category === categoryName);
  }

  async clearCategoryFromProducts(categoryName: string): Promise<void> {
    const products = await this.getProductsByCategory(categoryName);
    const repo = this.service.getRepository("products");

    for (const product of products) {
      product.category = "";
      await repo.update(product);
    }
  }
}

export const db = new IndexedDBService();

// Re-export types for backward compatibility
export type {
  User,
  Unit,
  ProductUnit,
  Warehouse,
  Employee,
  ProductStock,
  PriceType,
  PaymentMethod,
  Customer,
  ProductCategory,
  Product,
  Invoice,
  InvoiceItem,
  InstallmentPlan,
  InstallmentPayment,
  Payment,
  Expense,
  ExpenseCategory,
  ExpenseItem,
  Supplier,
  Purchase,
  PurchaseItem,
  PurchasePayment,
  RestaurantTable,
  Hall,
  Promotion,
  Role,
  Printer,
  PaymentApp,
  Setting,
  SalesReturn,
  SalesReturnItem,
  PurchaseReturn,
  PurchaseReturnItem,
  Shift,
  ShiftSales,
  AuditLog,
  CashMovement,
  DepositSource,
  Deposit,
  EmployeeAdvance,
  EmployeeDeduction,
  WhatsAppAccount,
  WhatsAppMessage,
  WhatsAppCampaign,
  WhatsAppTask,
  CartItem,
  PendingOrder,
} from "@/domain/entities/Index";
