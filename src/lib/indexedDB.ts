// نظام قاعدة البيانات المحلية IndexedDB
const DB_NAME = "MASRPOS";
const DB_VERSION = 13; // Added ProductUnits, Warehouses, ProductStock for multi-unit and multi-warehouse support

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "admin" | "manager" | "cashier" | "accountant" | string; // يدعم الأدوار الثابتة والديناميكية
  roleId?: string; // معرف الدور من جدول roles (للأدوار المخصصة)
  active: boolean;
  createdAt?: string;
}

// وحدات القياس (كجم، لتر، قطعة، علبة، إلخ)
export interface Unit {
  id: string;
  name: string; // مثل: "كيلوجرام"
  symbol: string; // مثل: "كجم"
  isDefault: boolean;
  createdAt: string;
}

// الوحدات المتعددة للمنتج (مثل: كرتونة = 10 قطع)
export interface ProductUnit {
  id: string;
  productId: string;
  unitId: string;
  unitName: string; // للعرض
  conversionFactor: number; // كم قطعة في هذه الوحدة (مثلاً: كرتونة = 10)
  price: number; // سعر البيع لهذه الوحدة
  barcode?: string; // باركود خاص بهذه الوحدة
  isBaseUnit: boolean; // هل هي الوحدة الأساسية (القطعة)
  createdAt: string;
}

// المخازن
export interface Warehouse {
  id: string;
  name: string;
  nameAr: string;
  location?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

// مخزون المنتج في كل مخزن
export interface ProductStock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minStock?: number;
  updatedAt: string;
}

// أنواع التسعير (عادي، جملة، تجزئة، خاص، إلخ)
export interface PriceType {
  id: string;
  name: string; // مثل: "سعر البيع"، "سعر الجملة"
  displayOrder: number; // ترتيب العرض
  isDefault: boolean; // السعر الافتراضي
  createdAt: string;
}

// طرق الدفع
export interface PaymentMethod {
  id: string;
  name: string; // مثل: "نقدي"، "فيزا"، "محفظة إلكترونية"
  type: "cash" | "wallet" | "visa" | "bank_transfer" | "other";
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  nationalId?: string;
  creditLimit: number;
  currentBalance: number;
  loyaltyPoints: number;
  createdAt: string;
  notes?: string;
}

// أقسام المنتجات
export interface ProductCategory {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number; // للتوافق مع الكود القديم - سيتم استخدام prices بدلاً منه
  prices: Record<string, number>; // { priceTypeId: price }
  costPrice: number; // سعر التكلفة للمنتج (مهم لحساب الجرد والربح)
  unitId: string; // معرف وحدة القياس الأساسية
  defaultPriceTypeId?: string; // نوع السعر الافتراضي للمنتج (اختياري، إذا كان مختلف عن الافتراضي العام)
  category?: string; // اسم القسم من جدول productCategories
  stock: number; // الكمية الإجمالية (للتوافق مع الكود القديم)
  barcode?: string;
  minStock?: number;
  expiryDate?: string;
  imageUrl?: string; // رابط صورة المنتج
  hasMultipleUnits?: boolean; // هل للمنتج وحدات متعددة
}

export interface Invoice {
  id: string;
  customerId?: string;
  customerName?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentType: "cash" | "credit" | "installment";
  paymentStatus: "paid" | "partial" | "unpaid";
  paidAmount: number;
  remainingAmount: number;
  paymentMethodIds: string[]; // معرفات طرق الدفع المستخدمة
  paymentMethodAmounts: Record<string, number>; // { methodId: amount } للدفع المقسم
  userId: string;
  userName: string;
  createdAt: string;
  dueDate?: string;
  installmentPlan?: InstallmentPlan;
  shiftId?: string; // الوردية التي تم فيها البيع
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  unitId: string; // وحدة القياس
  unitName: string; // اسم الوحدة للعرض
  conversionFactor: number; // معامل التحويل (كرتونة = 10 قطع)
  priceTypeId: string; // نوع السعر المستخدم
  priceTypeName: string; // اسم نوع السعر للعرض
  returnedQuantity?: number; // الكمية المرتجعة من هذا المنتج
  warehouseId?: string; // المخزن الذي تم البيع منه
}

export interface InstallmentPlan {
  numberOfInstallments: number;
  installmentAmount: number;
  interestRate: number;
  startDate: string;
  payments: InstallmentPayment[];
}

export interface InstallmentPayment {
  id: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  paymentMethod: "cash" | "card" | "wallet";
  userId: string;
  createdAt: string;
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  userId: string;
  createdAt: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  taxNumber?: string;
  balance: number;
  createdAt: string;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  position: string;
  salary: number;
  hireDate: string;
  salaryDay: number; // يوم صرف الراتب (1-31)
  deductions?: number; // الخصومات الشهرية الثابتة
  active: boolean;
  userId?: string;
  role?: "admin" | "manager" | "cashier" | "accountant" | string; // يدعم الأدوار الثابتة والديناميكية
  roleId?: string; // معرف الدور من جدول roles (للأدوار المخصصة)
  notes?: string;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  hallId: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  currentInvoiceId?: string;
}

export interface Hall {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  active: boolean;
  applicableProducts?: string[];
}

export interface Role {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  permissions: Record<string, string[]>; // { "invoices": ["view", "create"], "products": ["view"] }
  isDefault: boolean; // للأدوار الافتراضية (admin, manager, cashier, accountant)
  createdAt: string;
  updatedAt?: string;
}

export interface Printer {
  id: string;
  name: string;
  type: "thermal" | "a4";
  ipAddress?: string;
  port?: string;
  active: boolean;
}

export interface PaymentApp {
  id: string;
  name: string;
  type: "bank" | "wallet" | "card";
  apiKey?: string;
  active: boolean;
  fees: number;
}

export interface Setting {
  key: string;
  value: string;
  description?: string;
  category?: "company" | "tax" | "receipt" | "system";
  updatedAt: string;
}

// فاتورة مرتجع مبيعات (Sales Return)
export interface SalesReturn {
  id: string;
  originalInvoiceId: string; // الفاتورة الأصلية
  customerId?: string;
  customerName?: string;
  items: SalesReturnItem[];
  subtotal: number;
  tax: number;
  total: number;
  reason: string; // سبب الإرجاع
  userId: string;
  userName: string;
  createdAt: string;
  refundMethod: "cash" | "credit" | "balance"; // طريقة الاسترجاع
  refundStatus: "pending" | "completed" | "rejected";
  shiftId?: string; // الوردية التي تم فيها المرتجع
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  reason?: string; // سبب إرجاع المنتج
}

// فاتورة مرتجع مشتريات (Purchase Return)
export interface PurchaseReturn {
  id: string;
  originalPurchaseId: string; // فاتورة الشراء الأصلية
  supplierId: string;
  supplierName: string;
  items: PurchaseReturnItem[];
  subtotal: number;
  tax: number;
  total: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
  refundStatus: "pending" | "completed" | "rejected";
  shiftId?: string; // الوردية التي تم فيها المرتجع
}

export interface PurchaseReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  reason?: string;
}

// نظام الورديات (Shifts)
export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime?: string;
  startingCash: number; // المبلغ في بداية الوردية
  expectedCash?: number; // المبلغ المتوقع عند الإغلاق
  actualCash?: number; // المبلغ الفعلي عند الإغلاق
  difference?: number; // الفرق بين المتوقع والفعلي
  status: "active" | "closed";
  sales: ShiftSales;
  expenses: number;
  purchaseReturns: number; // قيمة مرتجعات المشتريات
  notes?: string;
  closedBy?: string;
}

export interface ShiftSales {
  totalInvoices: number;
  totalAmount: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  returns: number; // قيمة المرتجعات
}

export interface AuditLog {
  id: string;
  action: string; // e.g., "invoice.create", "product.update", "shift.close"
  entity: string; // e.g., "invoices", "products", "shifts"
  refId: string; // ID of the affected document
  userId: string;
  userName: string;
  shiftId?: string;
  oldValue?: any; // Optional: previous state (for updates)
  newValue?: any; // Optional: new state
  changes?: string; // JSON string of what changed
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  shiftId: number;
  type: "in" | "out"; // إيداع أو سحب
  amount: number;
  reason: string;
  category?: string; // e.g., "تسليم بنك"، "مصروف طارئ"، "تغذية الصندوق"
  userId: string;
  userName: string;
  createdAt: string;
  notes?: string;
}

// مصادر الإيداعات
export interface DepositSource {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// الإيداعات
export interface Deposit {
  id: string;
  amount: number;
  sourceId: string;
  sourceName: string;
  userId: string;
  userName: string;
  shiftId?: string;
  notes?: string;
  createdAt: string;
}

// فئات المصروفات
export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// المصروفات (نحدث الموجود)
export interface ExpenseItem {
  id: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  userId: string;
  userName: string;
  shiftId?: string;
  notes?: string;
  createdAt: string;
}

// السُلف للموظفين
export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "paid";
  approvedBy?: string;
  approvedAt?: string;
  paidAmount?: number;
  remainingAmount?: number;
  deductionAmount?: number; // المبلغ المخصوم شهرياً
  userId: string;
  userName: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// خصومات الموظفين
export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  type: "fixed" | "oneTime"; // ثابت أو مرة واحدة
  reason: string;
  startDate: string; // تاريخ بداية الخصم
  endDate?: string; // تاريخ نهاية الخصم (للخصم الثابت)
  status: "active" | "completed" | "cancelled";
  userId: string;
  userName: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// WhatsApp Integration
export interface WhatsAppAccount {
  id: string;
  name: string;
  phone: string;
  status: "disconnected" | "connecting" | "connected" | "qr" | "failed";
  qrCode?: string;
  dailyLimit: number;
  dailySent: number;
  lastResetDate: string;
  antiSpamDelay: number;
  isActive: boolean;
  createdAt: string;
  lastConnectedAt?: string;
}

export interface WhatsAppMessage {
  id: string;
  accountId: string;
  to: string;
  message: string;
  media?: {
    type: "image" | "document" | "video";
    url: string;
    filename?: string;
    caption?: string;
  };
  status: "pending" | "sending" | "sent" | "failed" | "paused";
  retries: number;
  scheduledAt?: string;
  sentAt?: string;
  error?: string;
  metadata?: {
    invoiceId?: string;
    customerId?: string;
    campaignId?: string;
    type?: "invoice" | "reminder" | "campaign" | "manual";
  };
  createdAt: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  accountId: string;
  template: string;
  variables: string[];
  targetType: "credit" | "installment" | "all" | "custom";
  filters?: {
    minAmount?: number;
    maxAmount?: number;
    daysBefore?: number;
  };
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "failed";
  scheduledAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface WhatsAppTask {
  id: string;
  type: "send_message" | "send_campaign" | "send_reminder";
  accountId: string;
  status: "running" | "paused" | "completed" | "failed";
  currentStep: string;
  currentIndex: number;
  totalItems: number;
  data: any;
  error?: string;
  pausedAt?: string;
  resumedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // إعادة تهيئة قاعدة البيانات (حذف وإنشاء من جديد)
  async resetDatabase(): Promise<void> {
    // إغلاق الاتصال إذا كان مفتوحاً
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initPromise = null;

    // حذف قاعدة البيانات
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

      deleteRequest.onsuccess = async () => {
        console.log("✅ تم حذف قاعدة البيانات القديمة");
        // إعادة الإنشاء
        await this.init();
        console.log("✅ تم إنشاء قاعدة البيانات الجديدة");
        resolve();
      };

      deleteRequest.onerror = () => {
        console.error("❌ فشل حذف قاعدة البيانات");
        reject(deleteRequest.error);
      };

      deleteRequest.onblocked = () => {
        console.warn(
          "⚠️ قاعدة البيانات محجوبة. يرجى إغلاق جميع علامات التبويب الأخرى"
        );
      };
    });
  }

  async init(): Promise<void> {
    // إذا كانت قاعدة البيانات مفتوحة بالفعل، لا تفعل شيء
    if (this.db) {
      return Promise.resolve();
    }

    // إذا كانت التهيئة جارية، انتظر حتى تنتهي
    if (this.initPromise) {
      return this.initPromise;
    }

    // ابدأ تهيئة جديدة
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Users store
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" });
          userStore.createIndex("username", "username", { unique: true });
        }

        // Customers store
        if (!db.objectStoreNames.contains("customers")) {
          const customerStore = db.createObjectStore("customers", {
            keyPath: "id",
          });
          customerStore.createIndex("phone", "phone", { unique: false });
        }

        // Products store
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", {
            keyPath: "id",
          });
          productStore.createIndex("barcode", "barcode", { unique: false });
          productStore.createIndex("category", "category", { unique: false });
        }

        // Invoices store
        if (!db.objectStoreNames.contains("invoices")) {
          const invoiceStore = db.createObjectStore("invoices", {
            keyPath: "id",
          });
          invoiceStore.createIndex("customerId", "customerId", {
            unique: false,
          });
          invoiceStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Payments store
        if (!db.objectStoreNames.contains("payments")) {
          const paymentStore = db.createObjectStore("payments", {
            keyPath: "id",
          });
          paymentStore.createIndex("invoiceId", "invoiceId", { unique: false });
          paymentStore.createIndex("customerId", "customerId", {
            unique: false,
          });
        }

        // Expenses store
        if (!db.objectStoreNames.contains("expenses")) {
          const expenseStore = db.createObjectStore("expenses", {
            keyPath: "id",
          });
          expenseStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Suppliers store
        if (!db.objectStoreNames.contains("suppliers")) {
          db.createObjectStore("suppliers", { keyPath: "id" });
        }

        // Employees store
        if (!db.objectStoreNames.contains("employees")) {
          db.createObjectStore("employees", { keyPath: "id" });
        }

        // Restaurant Tables store
        if (!db.objectStoreNames.contains("tables")) {
          const tableStore = db.createObjectStore("tables", { keyPath: "id" });
          tableStore.createIndex("hallId", "hallId", { unique: false });
        }

        // Halls store
        if (!db.objectStoreNames.contains("halls")) {
          db.createObjectStore("halls", { keyPath: "id" });
        }

        // Promotions store
        if (!db.objectStoreNames.contains("promotions")) {
          db.createObjectStore("promotions", { keyPath: "id" });
        }

        // Printers store
        if (!db.objectStoreNames.contains("printers")) {
          db.createObjectStore("printers", { keyPath: "id" });
        }

        // Payment Apps store
        if (!db.objectStoreNames.contains("paymentApps")) {
          db.createObjectStore("paymentApps", { keyPath: "id" });
        }

        // Settings store
        if (!db.objectStoreNames.contains("settings")) {
          const settingsStore = db.createObjectStore("settings", {
            keyPath: "key",
          });
          settingsStore.createIndex("category", "category", { unique: false });
        }

        // Sales Returns store
        if (!db.objectStoreNames.contains("salesReturns")) {
          const salesReturnsStore = db.createObjectStore("salesReturns", {
            keyPath: "id",
          });
          salesReturnsStore.createIndex(
            "originalInvoiceId",
            "originalInvoiceId",
            {
              unique: false,
            }
          );
          salesReturnsStore.createIndex("customerId", "customerId", {
            unique: false,
          });
          salesReturnsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Purchase Returns store
        if (!db.objectStoreNames.contains("purchaseReturns")) {
          const purchaseReturnsStore = db.createObjectStore("purchaseReturns", {
            keyPath: "id",
          });
          purchaseReturnsStore.createIndex(
            "originalPurchaseId",
            "originalPurchaseId",
            {
              unique: false,
            }
          );
          purchaseReturnsStore.createIndex("supplierId", "supplierId", {
            unique: false,
          });
          purchaseReturnsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Shifts store
        if (!db.objectStoreNames.contains("shifts")) {
          const shiftsStore = db.createObjectStore("shifts", { keyPath: "id" });
          shiftsStore.createIndex("employeeId", "employeeId", {
            unique: false,
          });
          shiftsStore.createIndex("status", "status", { unique: false });
          shiftsStore.createIndex("startTime", "startTime", { unique: false });
        }

        // Migration for version 5: Add purchaseReturns field to existing shifts
        if (event.oldVersion < 5 && db.objectStoreNames.contains("shifts")) {
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          const shiftsStore = transaction?.objectStore("shifts");

          if (shiftsStore) {
            const getAllRequest = shiftsStore.getAll();
            getAllRequest.onsuccess = () => {
              const shifts = getAllRequest.result;
              shifts.forEach((shift: any) => {
                if (shift.purchaseReturns === undefined) {
                  shift.purchaseReturns = 0;
                  shiftsStore.put(shift);
                }
              });
            };
          }
        }

        // Audit Logs store (v6)
        if (!db.objectStoreNames.contains("auditLogs")) {
          const auditLogsStore = db.createObjectStore("auditLogs", {
            keyPath: "id",
          });
          auditLogsStore.createIndex("action", "action", { unique: false });
          auditLogsStore.createIndex("entity", "entity", { unique: false });
          auditLogsStore.createIndex("userId", "userId", { unique: false });
          auditLogsStore.createIndex("shiftId", "shiftId", { unique: false });
          auditLogsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
          auditLogsStore.createIndex("refId", "refId", { unique: false });
        }

        // Cash Movements store (v6)
        if (!db.objectStoreNames.contains("cashMovements")) {
          const cashMovementsStore = db.createObjectStore("cashMovements", {
            keyPath: "id",
          });
          cashMovementsStore.createIndex("shiftId", "shiftId", {
            unique: false,
          });
          cashMovementsStore.createIndex("type", "type", { unique: false });
          cashMovementsStore.createIndex("userId", "userId", {
            unique: false,
          });
          cashMovementsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Roles store (v7)
        if (!db.objectStoreNames.contains("roles")) {
          const rolesStore = db.createObjectStore("roles", {
            keyPath: "id",
          });
          rolesStore.createIndex("nameEn", "nameEn", { unique: true });
          rolesStore.createIndex("isDefault", "isDefault", { unique: false });
        }

        // Deposit Sources store (v7)
        if (!db.objectStoreNames.contains("depositSources")) {
          const depositSourcesStore = db.createObjectStore("depositSources", {
            keyPath: "id",
          });
          depositSourcesStore.createIndex("active", "active", {
            unique: false,
          });
        }

        // Deposits store (v7)
        if (!db.objectStoreNames.contains("deposits")) {
          const depositsStore = db.createObjectStore("deposits", {
            keyPath: "id",
          });
          depositsStore.createIndex("sourceId", "sourceId", { unique: false });
          depositsStore.createIndex("userId", "userId", { unique: false });
          depositsStore.createIndex("shiftId", "shiftId", { unique: false });
          depositsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Expense Categories store (v7)
        if (!db.objectStoreNames.contains("expenseCategories")) {
          const expenseCategoriesStore = db.createObjectStore(
            "expenseCategories",
            {
              keyPath: "id",
            }
          );
          expenseCategoriesStore.createIndex("active", "active", {
            unique: false,
          });
        }

        // Expense Items store (v7)
        if (!db.objectStoreNames.contains("expenseItems")) {
          const expenseItemsStore = db.createObjectStore("expenseItems", {
            keyPath: "id",
          });
          expenseItemsStore.createIndex("categoryId", "categoryId", {
            unique: false,
          });
          expenseItemsStore.createIndex("userId", "userId", { unique: false });
          expenseItemsStore.createIndex("shiftId", "shiftId", {
            unique: false,
          });
          expenseItemsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Employee Advances store (v8)
        if (!db.objectStoreNames.contains("employeeAdvances")) {
          const employeeAdvancesStore = db.createObjectStore(
            "employeeAdvances",
            {
              keyPath: "id",
            }
          );
          employeeAdvancesStore.createIndex("employeeId", "employeeId", {
            unique: false,
          });
          employeeAdvancesStore.createIndex("status", "status", {
            unique: false,
          });
          employeeAdvancesStore.createIndex("userId", "userId", {
            unique: false,
          });
          employeeAdvancesStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Employee Deductions store (v9)
        if (!db.objectStoreNames.contains("employeeDeductions")) {
          const employeeDeductionsStore = db.createObjectStore(
            "employeeDeductions",
            {
              keyPath: "id",
            }
          );
          employeeDeductionsStore.createIndex("employeeId", "employeeId", {
            unique: false,
          });
          employeeDeductionsStore.createIndex("type", "type", {
            unique: false,
          });
          employeeDeductionsStore.createIndex("status", "status", {
            unique: false,
          });
          employeeDeductionsStore.createIndex("userId", "userId", {
            unique: false,
          });
          employeeDeductionsStore.createIndex("startDate", "startDate", {
            unique: false,
          });
          employeeDeductionsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Product Categories store (v10)
        if (!db.objectStoreNames.contains("productCategories")) {
          const productCategoriesStore = db.createObjectStore(
            "productCategories",
            {
              keyPath: "id",
            }
          );
          productCategoriesStore.createIndex("name", "name", {
            unique: false,
          });
          productCategoriesStore.createIndex("nameAr", "nameAr", {
            unique: true, // Make nameAr unique
          });
          productCategoriesStore.createIndex("active", "active", {
            unique: false,
          });
          productCategoriesStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // WhatsApp Accounts store (v11)
        if (!db.objectStoreNames.contains("whatsappAccounts")) {
          const whatsappAccountsStore = db.createObjectStore(
            "whatsappAccounts",
            {
              keyPath: "id",
            }
          );
          whatsappAccountsStore.createIndex("phone", "phone", {
            unique: true,
          });
          whatsappAccountsStore.createIndex("status", "status", {
            unique: false,
          });
          whatsappAccountsStore.createIndex("isActive", "isActive", {
            unique: false,
          });
          whatsappAccountsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // WhatsApp Messages store (v11)
        if (!db.objectStoreNames.contains("whatsappMessages")) {
          const whatsappMessagesStore = db.createObjectStore(
            "whatsappMessages",
            {
              keyPath: "id",
            }
          );
          whatsappMessagesStore.createIndex("accountId", "accountId", {
            unique: false,
          });
          whatsappMessagesStore.createIndex("status", "status", {
            unique: false,
          });
          whatsappMessagesStore.createIndex("to", "to", { unique: false });
          whatsappMessagesStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // WhatsApp Campaigns store (v11)
        if (!db.objectStoreNames.contains("whatsappCampaigns")) {
          const whatsappCampaignsStore = db.createObjectStore(
            "whatsappCampaigns",
            {
              keyPath: "id",
            }
          );
          whatsappCampaignsStore.createIndex("accountId", "accountId", {
            unique: false,
          });
          whatsappCampaignsStore.createIndex("status", "status", {
            unique: false,
          });
          whatsappCampaignsStore.createIndex("targetType", "targetType", {
            unique: false,
          });
          whatsappCampaignsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // WhatsApp Tasks store (v11)
        if (!db.objectStoreNames.contains("whatsappTasks")) {
          const whatsappTasksStore = db.createObjectStore("whatsappTasks", {
            keyPath: "id",
          });
          whatsappTasksStore.createIndex("accountId", "accountId", {
            unique: false,
          });
          whatsappTasksStore.createIndex("type", "type", { unique: false });
          whatsappTasksStore.createIndex("status", "status", {
            unique: false,
          });
          whatsappTasksStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Units store (v12)
        if (!db.objectStoreNames.contains("units")) {
          const unitsStore = db.createObjectStore("units", {
            keyPath: "id",
          });
          unitsStore.createIndex("name", "name", { unique: true });
          unitsStore.createIndex("isDefault", "isDefault", { unique: false });
          unitsStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Price Types store (v12)
        if (!db.objectStoreNames.contains("priceTypes")) {
          const priceTypesStore = db.createObjectStore("priceTypes", {
            keyPath: "id",
          });
          priceTypesStore.createIndex("name", "name", { unique: true });
          priceTypesStore.createIndex("displayOrder", "displayOrder", {
            unique: false,
          });
          priceTypesStore.createIndex("isDefault", "isDefault", {
            unique: false,
          });
          priceTypesStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Payment Methods store (v12)
        if (!db.objectStoreNames.contains("paymentMethods")) {
          const paymentMethodsStore = db.createObjectStore("paymentMethods", {
            keyPath: "id",
          });
          paymentMethodsStore.createIndex("name", "name", { unique: true });
          paymentMethodsStore.createIndex("type", "type", { unique: false });
          paymentMethodsStore.createIndex("isActive", "isActive", {
            unique: false,
          });
          paymentMethodsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Product Units store (v13) - الوحدات المتعددة للمنتج
        if (!db.objectStoreNames.contains("productUnits")) {
          const productUnitsStore = db.createObjectStore("productUnits", {
            keyPath: "id",
          });
          productUnitsStore.createIndex("productId", "productId", {
            unique: false,
          });
          productUnitsStore.createIndex("unitId", "unitId", { unique: false });
          productUnitsStore.createIndex("barcode", "barcode", {
            unique: false,
          });
          productUnitsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Warehouses store (v13)
        if (!db.objectStoreNames.contains("warehouses")) {
          const warehousesStore = db.createObjectStore("warehouses", {
            keyPath: "id",
          });
          warehousesStore.createIndex("nameAr", "nameAr", { unique: true });
          warehousesStore.createIndex("isDefault", "isDefault", {
            unique: false,
          });
          warehousesStore.createIndex("isActive", "isActive", {
            unique: false,
          });
          warehousesStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
        }

        // Product Stock store (v13) - مخزون المنتج في كل مخزن
        if (!db.objectStoreNames.contains("productStock")) {
          const productStockStore = db.createObjectStore("productStock", {
            keyPath: "id",
          });
          productStockStore.createIndex("productId", "productId", {
            unique: false,
          });
          productStockStore.createIndex("warehouseId", "warehouseId", {
            unique: false,
          });
          // إنشاء index مركب للبحث بـ productId + warehouseId
          productStockStore.createIndex(
            "productWarehouse",
            ["productId", "warehouseId"],
            { unique: true }
          );
          productStockStore.createIndex("updatedAt", "updatedAt", {
            unique: false,
          });
        }
      };
    });

    return this.initPromise;
  }

  // Generic CRUD operations
  async add<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Check if object store exists
    if (!this.db.objectStoreNames.contains(storeName)) {
      console.error(
        `Object store '${storeName}' not found. Resetting database...`
      );
      await this.resetDatabase();
      if (!this.db) throw new Error("Failed to reset database");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Initialize with default admin user
  async initDefaultData(): Promise<void> {
    const users = await this.getAll<User>("users");
    if (users.length === 0) {
      const adminUser: User = {
        id: "1",
        username: "admin",
        password: "admin123", // في الإنتاج يجب تشفير كلمة المرور
        name: "المدير العام",
        role: "admin",
        active: true,
        createdAt: new Date().toISOString(),
      };
      await this.add("users", adminUser);
    }

    // تم إلغاء إضافة المنتجات التجريبية التلقائية
    // المستخدم يضيف منتجاته بنفسه

    // إضافة إعدادات افتراضية إذا لم تكن موجودة
    const settings = await this.getAll<Setting>("settings");
    if (settings.length === 0) {
      const defaultSettings: Setting[] = [
        {
          key: "company_name",
          value: "MASR POS Pro",
          description: "اسم الشركة",
          category: "company",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "company_phone",
          value: "",
          description: "رقم هاتف الشركة",
          category: "company",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "company_address",
          value: "",
          description: "عنوان الشركة",
          category: "company",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "tax_number",
          value: "",
          description: "الرقم الضريبي",
          category: "tax",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "tax_rate",
          value: "14",
          description: "نسبة الضريبة %",
          category: "tax",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "currency",
          value: "EGP",
          description: "العملة",
          category: "system",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "receipt_footer",
          value: "شكراً لزيارتكم - نتمنى رؤيتكم مرة أخرى",
          description: "نص أسفل الفاتورة",
          category: "receipt",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "receipt_header",
          value: "",
          description: "نص أعلى الفاتورة",
          category: "receipt",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "enable_auto_print",
          value: "false",
          description: "تفعيل الطباعة التلقائية",
          category: "system",
          updatedAt: new Date().toISOString(),
        },
        {
          key: "low_stock_alert",
          value: "10",
          description: "حد التنبيه للمخزون المنخفض",
          category: "system",
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const setting of defaultSettings) {
        await this.add("settings", setting);
      }
    }
  }

  // إضافة الأدوار الافتراضية
  async initializeDefaultRoles(): Promise<void> {
    const existingRoles = await this.getAll<Role>("roles");
    if (existingRoles.length > 0) return; // الأدوار موجودة بالفعل

    const defaultRoles: Role[] = [
      {
        id: "admin",
        name: "مدير النظام",
        nameEn: "admin",
        description: "صلاحيات كاملة على جميع أجزاء النظام",
        color: "bg-red-500",
        isDefault: true,
        createdAt: new Date().toISOString(),
        permissions: {
          invoices: ["view", "create", "edit", "delete", "refund"],
          products: ["view", "create", "edit", "delete", "adjustStock"],
          customers: ["view", "create", "edit", "delete"],
          suppliers: ["view", "create", "edit", "delete"],
          employees: ["view", "create", "edit", "delete"],
          reports: ["view", "export"],
          settings: ["view", "edit"],
          shifts: ["view", "create", "close"],
          credit: ["view", "edit"],
          installments: ["view", "edit"],
          promotions: ["view", "create", "edit", "delete"],
          restaurant: ["view", "create"],
          returns: ["view", "create"],
          depositSources: ["view", "create", "update"],
          deposits: ["view", "create"],
          expenseCategories: ["view", "create", "update"],
          expenses: ["view", "create"],
        },
      },
      {
        id: "manager",
        name: "مدير",
        nameEn: "manager",
        description: "صلاحيات إدارية على المبيعات والموظفين والتقارير",
        color: "bg-blue-500",
        isDefault: true,
        createdAt: new Date().toISOString(),
        permissions: {
          invoices: ["view", "create", "edit", "refund"],
          products: ["view", "create", "edit", "adjustStock"],
          customers: ["view", "create", "edit"],
          suppliers: ["view", "create", "edit"],
          employees: ["view", "edit"],
          reports: ["view", "export"],
          settings: ["view"],
          shifts: ["view", "create", "close"],
          credit: ["view", "edit"],
          installments: ["view", "edit"],
          promotions: ["view", "create", "edit"],
          restaurant: ["view", "create"],
          returns: ["view", "create"],
          depositSources: ["view", "create", "update"],
          deposits: ["view", "create"],
          expenseCategories: ["view", "create", "update"],
          expenses: ["view", "create"],
        },
      },
      {
        id: "cashier",
        name: "كاشير",
        nameEn: "cashier",
        description: "صلاحيات البيع وإدارة الفواتير فقط",
        color: "bg-green-500",
        isDefault: true,
        createdAt: new Date().toISOString(),
        permissions: {
          invoices: ["view", "create"],
          products: ["view"],
          customers: ["view", "create"],
          suppliers: [],
          employees: [],
          reports: [],
          settings: [],
          shifts: ["view", "create"],
          credit: ["view"],
          installments: ["view"],
          promotions: ["view"],
          restaurant: ["view"],
          returns: ["view", "create"],
          depositSources: [],
          deposits: [],
          expenseCategories: [],
          expenses: [],
        },
      },
      {
        id: "accountant",
        name: "محاسب",
        nameEn: "accountant",
        description: "صلاحيات عرض التقارير المالية والمحاسبية",
        color: "bg-purple-500",
        isDefault: true,
        createdAt: new Date().toISOString(),
        permissions: {
          invoices: ["view"],
          products: ["view"],
          customers: ["view"],
          suppliers: ["view"],
          employees: [],
          reports: ["view", "export"],
          settings: [],
          shifts: ["view"],
          credit: ["view"],
          installments: ["view"],
          promotions: ["view"],
          restaurant: [],
          returns: ["view"],
          depositSources: ["view"],
          deposits: ["view"],
          expenseCategories: ["view"],
          expenses: ["view"],
        },
      },
    ];

    for (const role of defaultRoles) {
      await this.add("roles", role);
    }
  }

  // Migration: تحديث صلاحيات الأدوار الموجودة بإضافة الصلاحيات الجديدة
  async migrateRolesPermissions(): Promise<void> {
    const roles = await this.getAll<Role>("roles");

    const permissionsToAdd = {
      depositSources: {
        admin: ["view", "create", "update"],
        manager: ["view", "create", "update"],
        cashier: [],
        accountant: ["view"],
      },
      deposits: {
        admin: ["view", "create"],
        manager: ["view", "create"],
        cashier: [],
        accountant: ["view"],
      },
      expenseCategories: {
        admin: ["view", "create", "update"],
        manager: ["view", "create", "update"],
        cashier: [],
        accountant: ["view"],
      },
      expenses: {
        admin: ["view", "create"],
        manager: ["view", "create"],
        cashier: [],
        accountant: ["view"],
      },
    };

    for (const role of roles) {
      // تحقق إذا الصلاحيات الجديدة موجودة
      const needsUpdate =
        !role.permissions.depositSources ||
        !role.permissions.deposits ||
        !role.permissions.expenseCategories ||
        !role.permissions.expenses;

      if (needsUpdate && role.isDefault) {
        // تحديث الأدوار الافتراضية
        const roleKey =
          role.nameEn.toLowerCase() as keyof typeof permissionsToAdd.depositSources;

        if (permissionsToAdd.depositSources[roleKey]) {
          role.permissions.depositSources =
            permissionsToAdd.depositSources[roleKey];
          role.permissions.deposits = permissionsToAdd.deposits[roleKey];
          role.permissions.expenseCategories =
            permissionsToAdd.expenseCategories[roleKey];
          role.permissions.expenses = permissionsToAdd.expenses[roleKey];

          await this.update("roles", role);
          console.log(`✅ تم تحديث صلاحيات دور: ${role.name}`);
        }
      } else if (needsUpdate && !role.isDefault) {
        // للأدوار المخصصة، إضافة الصلاحيات فارغة
        role.permissions.depositSources = role.permissions.depositSources || [];
        role.permissions.deposits = role.permissions.deposits || [];
        role.permissions.expenseCategories =
          role.permissions.expenseCategories || [];
        role.permissions.expenses = role.permissions.expenses || [];

        await this.update("roles", role);
        console.log(`✅ تم تحديث دور مخصص: ${role.name}`);
      }
    }
  }

  // Check if category name already exists
  async isCategoryNameExists(
    nameAr: string,
    excludeId?: string
  ): Promise<boolean> {
    const categories = await this.getAll<ProductCategory>("productCategories");
    return categories.some(
      (cat) =>
        cat.nameAr.toLowerCase() === nameAr.toLowerCase() &&
        cat.id !== excludeId
    );
  }

  // Get products by category name
  async getProductsByCategory(categoryName: string): Promise<Product[]> {
    const products = await this.getAll<Product>("products");
    return products.filter((product) => product.category === categoryName);
  }

  // Clear category from products
  async clearCategoryFromProducts(categoryName: string): Promise<void> {
    const products = await this.getProductsByCategory(categoryName);
    for (const product of products) {
      product.category = "";
      await this.update("products", product);
    }
  }

  // Migration: Update old data to new structure (v12)
  async migrateToV12(): Promise<void> {
    try {
      console.log("🔄 بدء migration للإصدار 12...");

      // 1. Create default unit if not exists
      const units = await this.getAll<Unit>("units");
      let defaultUnit: Unit;

      if (units.length === 0) {
        defaultUnit = {
          id: "default-unit",
          name: "قطعة",
          symbol: "قطعة",
          isDefault: true,
          createdAt: new Date().toISOString(),
        };
        await this.add("units", defaultUnit);
        console.log("✅ تم إنشاء وحدة القياس الافتراضية");
      } else {
        defaultUnit = units.find((u) => u.isDefault) || units[0];
      }

      // 2. Create default price type if not exists
      const priceTypes = await this.getAll<PriceType>("priceTypes");
      let defaultPriceType: PriceType;

      if (priceTypes.length === 0) {
        defaultPriceType = {
          id: "default-price-type",
          name: "سعر البيع",
          displayOrder: 1,
          isDefault: true,
          createdAt: new Date().toISOString(),
        };
        await this.add("priceTypes", defaultPriceType);
        console.log("✅ تم إنشاء نوع السعر الافتراضي");
      } else {
        defaultPriceType =
          priceTypes.find((pt) => pt.isDefault) || priceTypes[0];
      }

      // 3. Create default payment method if not exists
      const paymentMethods = await this.getAll<PaymentMethod>("paymentMethods");
      let defaultPaymentMethod: PaymentMethod;

      if (paymentMethods.length === 0) {
        defaultPaymentMethod = {
          id: "default-payment-cash",
          name: "نقدي",
          type: "cash",
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await this.add("paymentMethods", defaultPaymentMethod);
        console.log("✅ تم إنشاء طريقة الدفع الافتراضية");
      } else {
        defaultPaymentMethod = paymentMethods[0];
      }

      // 4. Migrate existing products
      const products = await this.getAll<Product>("products");
      let migratedCount = 0;

      for (const product of products) {
        let needsUpdate = false;

        // Check if product needs migration
        if (!product.unitId) {
          product.unitId = defaultUnit.id;
          needsUpdate = true;
        }

        if (!product.prices || Object.keys(product.prices).length === 0) {
          // Convert old price to new prices structure
          product.prices = {
            [defaultPriceType.id]: product.price,
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          await this.update("products", product);
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        console.log(`✅ تم تحديث ${migratedCount} منتج`);
      }

      // 5. Migrate existing invoices
      const invoices = await this.getAll<Invoice>("invoices");
      let invoicesMigrated = 0;

      for (const invoice of invoices) {
        let needsUpdate = false;

        // Add payment methods if not exists
        if (
          !invoice.paymentMethodIds ||
          invoice.paymentMethodIds.length === 0
        ) {
          invoice.paymentMethodIds = [defaultPaymentMethod.id];
          invoice.paymentMethodAmounts = {
            [defaultPaymentMethod.id]: invoice.paidAmount,
          };
          needsUpdate = true;
        }

        // Update invoice items
        if (invoice.items && invoice.items.length > 0) {
          for (const item of invoice.items) {
            if (!item.unitId) {
              item.unitId = defaultUnit.id;
              item.unitName = defaultUnit.name;
              needsUpdate = true;
            }
            if (!item.priceTypeId) {
              item.priceTypeId = defaultPriceType.id;
              item.priceTypeName = defaultPriceType.name;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          await this.update("invoices", invoice);
          invoicesMigrated++;
        }
      }

      if (invoicesMigrated > 0) {
        console.log(`✅ تم تحديث ${invoicesMigrated} فاتورة`);
      }

      console.log("✅ اكتمل migration للإصدار 12 بنجاح");
    } catch (error) {
      console.error("❌ خطأ في migration:", error);
    }
  }
}

export const db = new IndexedDBService();
