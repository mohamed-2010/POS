/**
 * FieldMapper - COMPLETE Data transformation layer between client and server schemas
 * 
 * Based on ACTUAL MySQL schema from migrations
 * Handles:
 * - camelCase (client) ↔ snake_case (server) conversion
 * - Adding required server fields (client_id, branch_id)
 * - Removing client-only fields
 * - Default values for optional server fields
 * - Skipping base64 images
 * - Validating foreign keys
 */

// Helper: Convert ISO 8601 to MySQL datetime format
function toMySQLDateTime(isoString: string): string {
    if (!isoString) return isoString;
    return isoString.replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

// Helper: Skip base64 images
function skipBase64(val: string): string | null {
    if (!val) return null;
    if (val.startsWith('data:')) return null;
    return val;
}

// Helper: Validate ID format (UUID, numeric, or compound IDs with underscores)
function validateId(val: string): string | null {
    if (!val) return null;
    // UUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return val;
    // Numeric ID
    if (/^\d+$/.test(val)) return val;
    // Compound ID with underscores (e.g., 1763927275416_fu3ulz97e or default-unit)
    if (/^[a-zA-Z0-9_-]+$/.test(val)) return val;
    // Otherwise skip
    return null;
}

interface FieldMapping {
    clientField: string;
    serverField: string;
    defaultValue?: any;
    transform?: (value: any) => any;
}

interface TableMapping {
    fields: FieldMapping[];
    serverDefaults?: Record<string, any>;
    clientOnlyFields?: string[];
}

// ==================== COMPLETE TABLE MAPPINGS ====================

// Product Categories - MySQL: name_ar, name_en, description, color, active
const PRODUCT_CATEGORIES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'nameAr', serverField: 'name_ar' },
        { clientField: 'name', serverField: 'name_ar' },
        { clientField: 'description', serverField: 'description', defaultValue: '' },
        { clientField: 'active', serverField: 'active', defaultValue: true },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    serverDefaults: { name_en: null, color: null },
    clientOnlyFields: ['local_updated_at'],
};

// Products - MySQL: name, name_en, description, barcode, sku, cost_price, selling_price, stock, min_stock, max_stock, unit, tax_rate, discount_rate, active, image_url, category_id
const PRODUCTS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'nameAr', serverField: 'name' },
        { clientField: 'nameEn', serverField: 'name_en' },
        { clientField: 'description', serverField: 'description' },
        { clientField: 'barcode', serverField: 'barcode' },
        { clientField: 'sku', serverField: 'sku' },
        { clientField: 'price', serverField: 'selling_price', defaultValue: 0 },
        { clientField: 'sellingPrice', serverField: 'selling_price', defaultValue: 0 },
        { clientField: 'cost', serverField: 'cost_price', defaultValue: 0 },
        { clientField: 'costPrice', serverField: 'cost_price', defaultValue: 0 },
        { clientField: 'stock', serverField: 'stock', defaultValue: 0 },
        { clientField: 'minStock', serverField: 'min_stock', defaultValue: 0 },
        { clientField: 'maxStock', serverField: 'max_stock', defaultValue: 0 },
        { clientField: 'unit', serverField: 'unit', defaultValue: 'piece' },
        { clientField: 'taxRate', serverField: 'tax_rate', defaultValue: 0 },
        { clientField: 'discountRate', serverField: 'discount_rate', defaultValue: 0 },
        { clientField: 'active', serverField: 'active', defaultValue: true },
        { clientField: 'category', serverField: 'category_id', transform: validateId },
        { clientField: 'categoryId', serverField: 'category_id', transform: validateId },
        { clientField: 'imageUrl', serverField: 'image_url', transform: skipBase64 },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at', 'prices', 'unitId', 'defaultPriceTypeId', 'expiryDate', 'hasMultipleUnits', 'userId'],
};

// Customers - MySQL: name, phone, email, address, credit_limit, balance, notes
const CUSTOMERS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'phone', serverField: 'phone' },
        { clientField: 'email', serverField: 'email' },
        { clientField: 'address', serverField: 'address' },
        { clientField: 'creditLimit', serverField: 'credit_limit', defaultValue: 0 },
        { clientField: 'balance', serverField: 'balance', defaultValue: 0 },
        { clientField: 'currentBalance', serverField: 'balance', defaultValue: 0 },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at', 'totalPurchases', 'active'],
};

// Suppliers - MySQL: name, phone, email, address, tax_number, credit_limit, balance, payment_terms, notes
const SUPPLIERS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'phone', serverField: 'phone' },
        { clientField: 'email', serverField: 'email' },
        { clientField: 'address', serverField: 'address' },
        { clientField: 'taxNumber', serverField: 'tax_number' },
        { clientField: 'creditLimit', serverField: 'credit_limit', defaultValue: 0 },
        { clientField: 'balance', serverField: 'balance', defaultValue: 0 },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at', 'active'],
};

// Employees - MySQL: name, phone, email, position, salary, hire_date, active, notes, user_id
const EMPLOYEES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'phone', serverField: 'phone' },
        { clientField: 'email', serverField: 'email' },
        { clientField: 'position', serverField: 'position' },
        { clientField: 'salary', serverField: 'salary', defaultValue: 0 },
        { clientField: 'hireDate', serverField: 'hire_date' },
        { clientField: 'active', serverField: 'active', defaultValue: true },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'userId', serverField: 'user_id' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Invoices - MySQL: invoice_number, customer_id, total, discount, tax, net_total, paid_amount, remaining_amount, payment_status, invoice_date, notes, created_by
const INVOICES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'invoiceNumber', serverField: 'invoice_number' },
        { clientField: 'customerId', serverField: 'customer_id', transform: validateId },
        { clientField: 'total', serverField: 'total', defaultValue: 0 },
        { clientField: 'discount', serverField: 'discount', defaultValue: 0 },
        { clientField: 'tax', serverField: 'tax', defaultValue: 0 },
        { clientField: 'netTotal', serverField: 'net_total', defaultValue: 0 },
        { clientField: 'paidAmount', serverField: 'paid_amount', defaultValue: 0 },
        { clientField: 'remainingAmount', serverField: 'remaining_amount', defaultValue: 0 },
        { clientField: 'paymentStatus', serverField: 'payment_status', defaultValue: 'unpaid' },
        { clientField: 'invoiceDate', serverField: 'invoice_date', transform: toMySQLDateTime },
        { clientField: 'createdAt', serverField: 'invoice_date', transform: toMySQLDateTime },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'userId', serverField: 'created_by' },
    ],
    serverDefaults: { invoice_number: () => `INV-${Date.now()}` },
    clientOnlyFields: ['local_updated_at', 'items', 'userName', 'shiftId', 'paymentType', 'paymentMethodIds', 'paymentMethodAmounts', 'subtotal', 'updatedAt'],
};

// Purchases - MySQL: purchase_number, supplier_id, total, discount, tax, net_total, paid_amount, remaining_amount, payment_status, purchase_date, notes, created_by
const PURCHASES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'purchaseNumber', serverField: 'purchase_number' },
        { clientField: 'supplierId', serverField: 'supplier_id', transform: validateId },
        { clientField: 'total', serverField: 'total', defaultValue: 0 },
        { clientField: 'totalAmount', serverField: 'total', defaultValue: 0 },
        { clientField: 'discount', serverField: 'discount', defaultValue: 0 },
        { clientField: 'tax', serverField: 'tax', defaultValue: 0 },
        { clientField: 'netTotal', serverField: 'net_total', defaultValue: 0 },
        { clientField: 'paidAmount', serverField: 'paid_amount', defaultValue: 0 },
        { clientField: 'remainingAmount', serverField: 'remaining_amount', defaultValue: 0 },
        { clientField: 'paymentStatus', serverField: 'payment_status', defaultValue: 'unpaid' },
        { clientField: 'purchaseDate', serverField: 'purchase_date', transform: toMySQLDateTime },
        { clientField: 'createdAt', serverField: 'purchase_date', transform: toMySQLDateTime },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'userId', serverField: 'created_by' },
    ],
    serverDefaults: { purchase_number: () => `PUR-${Date.now()}` },
    clientOnlyFields: ['local_updated_at', 'items', 'shiftId', 'updatedAt'],
};

// Expenses - MySQL: category_id, amount, expense_date, payment_method_id, description, receipt_number, notes
const EXPENSES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'categoryId', serverField: 'category_id', transform: validateId },
        { clientField: 'amount', serverField: 'amount' },
        { clientField: 'expenseDate', serverField: 'expense_date', transform: toMySQLDateTime },
        { clientField: 'createdAt', serverField: 'expense_date', transform: toMySQLDateTime },
        { clientField: 'paymentMethodId', serverField: 'payment_method_id', transform: validateId },
        { clientField: 'description', serverField: 'description' },
        { clientField: 'receiptNumber', serverField: 'receipt_number' },
        { clientField: 'notes', serverField: 'notes' },
    ],
    clientOnlyFields: ['local_updated_at', 'category'],
};

// Shifts - MySQL: employee_id, start_time, end_time, status, opening_cash, closing_cash, total_sales, notes
const SHIFTS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'employeeId', serverField: 'employee_id' },
        { clientField: 'startTime', serverField: 'start_time', transform: toMySQLDateTime },
        { clientField: 'endTime', serverField: 'end_time', transform: toMySQLDateTime },
        { clientField: 'status', serverField: 'status', defaultValue: 'open' },
        { clientField: 'startingCash', serverField: 'opening_cash', defaultValue: 0 },
        { clientField: 'openingCash', serverField: 'opening_cash', defaultValue: 0 },
        { clientField: 'closingCash', serverField: 'closing_cash', defaultValue: 0 },
        { clientField: 'totalSales', serverField: 'total_sales', defaultValue: 0 },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at', 'employeeName', 'sales', 'expenses', 'purchaseReturns'],
};

// Units - MySQL: name, symbol, is_default
const UNITS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'symbol', serverField: 'symbol' },
        { clientField: 'isDefault', serverField: 'is_default', defaultValue: false },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Price Types - MySQL: name, display_order, is_default
const PRICE_TYPES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'displayOrder', serverField: 'display_order', defaultValue: 0 },
        { clientField: 'isDefault', serverField: 'is_default', defaultValue: false },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Warehouses - MySQL: name_ar, name_en, is_default, is_active
const WAREHOUSES_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'nameAr', serverField: 'name_ar' },
        { clientField: 'name', serverField: 'name_ar' },
        { clientField: 'nameEn', serverField: 'name_en' },
        { clientField: 'isDefault', serverField: 'is_default', defaultValue: false },
        { clientField: 'isActive', serverField: 'is_active', defaultValue: true },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Audit Logs - MySQL: action, entity, user_id, shift_id, ref_id, details
const AUDIT_LOGS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'action', serverField: 'action' },
        { clientField: 'entity', serverField: 'entity' },
        { clientField: 'refId', serverField: 'ref_id' },
        { clientField: 'userId', serverField: 'user_id' },
        { clientField: 'shiftId', serverField: 'shift_id' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at', 'userName', 'newValue', 'oldValue'],
};

// Payments - MySQL: invoice_id, customer_id, amount, method, notes
const PAYMENTS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'invoiceId', serverField: 'invoice_id', transform: validateId },
        { clientField: 'customerId', serverField: 'customer_id', transform: validateId },
        { clientField: 'amount', serverField: 'amount' },
        { clientField: 'method', serverField: 'method' },
        { clientField: 'notes', serverField: 'notes' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Settings - MySQL: id, setting_key, setting_value, setting_group, description
const SETTINGS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'key', serverField: 'setting_key' },
        { clientField: 'value', serverField: 'setting_value' },
        { clientField: 'category', serverField: 'setting_group', defaultValue: 'general' },
        { clientField: 'description', serverField: 'description' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Payment Methods - MySQL: name, name_en, type, active, sort_order
const PAYMENT_METHODS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'name', serverField: 'name' },
        { clientField: 'nameEn', serverField: 'name_en' },
        { clientField: 'type', serverField: 'type', defaultValue: 'cash' },
        { clientField: 'active', serverField: 'active', defaultValue: 1 },
        { clientField: 'sortOrder', serverField: 'sort_order', defaultValue: 0 },
        { clientField: 'createdBy', serverField: 'created_by' },
        { clientField: 'updatedBy', serverField: 'updated_by' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
        { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Expense Items - MySQL: category_id, user_id, shift_id, amount, description
const EXPENSE_ITEMS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'categoryId', serverField: 'category_id', transform: validateId },
        { clientField: 'userId', serverField: 'user_id', transform: validateId },
        { clientField: 'shiftId', serverField: 'shift_id', transform: validateId },
        { clientField: 'amount', serverField: 'amount' },
        { clientField: 'description', serverField: 'description' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at'],
};

// Invoice Items - MySQL: invoice_id, product_id, quantity, unit_price, discount, tax, total
const INVOICE_ITEMS_MAPPING: TableMapping = {
    fields: [
        { clientField: 'id', serverField: 'id' },
        { clientField: 'invoiceId', serverField: 'invoice_id', transform: validateId },
        { clientField: 'productId', serverField: 'product_id', transform: validateId },
        { clientField: 'quantity', serverField: 'quantity' },
        { clientField: 'price', serverField: 'unit_price' },
        { clientField: 'discount', serverField: 'discount', defaultValue: 0 },
        { clientField: 'tax', serverField: 'tax', defaultValue: 0 },
        { clientField: 'total', serverField: 'total' },
        { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
    ],
    clientOnlyFields: ['local_updated_at', 'productName', 'unitId', 'unitName', 'conversionFactor',
        'priceTypeId', 'priceTypeName', 'selectedUnitName', 'productUnitId'],
};

// ==================== MASTER MAPPING REGISTRY ====================
const TABLE_MAPPINGS: Record<string, TableMapping> = {
    product_categories: PRODUCT_CATEGORIES_MAPPING,
    products: PRODUCTS_MAPPING,
    customers: CUSTOMERS_MAPPING,
    suppliers: SUPPLIERS_MAPPING,
    employees: EMPLOYEES_MAPPING,
    invoices: INVOICES_MAPPING,
    invoice_items: INVOICE_ITEMS_MAPPING,
    purchases: PURCHASES_MAPPING,
    expenses: EXPENSES_MAPPING,
    expense_items: EXPENSE_ITEMS_MAPPING,
    shifts: SHIFTS_MAPPING,
    units: UNITS_MAPPING,
    price_types: PRICE_TYPES_MAPPING,
    warehouses: WAREHOUSES_MAPPING,
    audit_logs: AUDIT_LOGS_MAPPING,
    payments: PAYMENTS_MAPPING,
    payment_methods: PAYMENT_METHODS_MAPPING,
    settings: SETTINGS_MAPPING,
    // Product Units - MySQL: product_id, unit_id, barcode, conversion_factor, price
    product_units: {
        fields: [
            { clientField: 'id', serverField: 'id' },
            { clientField: 'productId', serverField: 'product_id', transform: validateId },
            { clientField: 'unitId', serverField: 'unit_id', transform: validateId },
            { clientField: 'barcode', serverField: 'barcode' },
            { clientField: 'conversionFactor', serverField: 'conversion_factor', defaultValue: 1 },
            { clientField: 'price', serverField: 'price' },
            { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
            { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
        ],
        clientOnlyFields: ['local_updated_at', 'unitName', 'prices'],
    },
    // Expense Categories - MySQL: name, name_en, description, active
    expense_categories: {
        fields: [
            { clientField: 'id', serverField: 'id' },
            { clientField: 'name', serverField: 'name' },
            { clientField: 'nameEn', serverField: 'name_en' },
            { clientField: 'description', serverField: 'description' },
            { clientField: 'active', serverField: 'active', defaultValue: 1 },
            { clientField: 'createdBy', serverField: 'created_by' },
            { clientField: 'updatedBy', serverField: 'updated_by' },
            { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
            { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
        ],
        clientOnlyFields: ['local_updated_at'],
    },
    // Sales Returns - MySQL: original_invoice_id, customer_id, total_amount, reason, status
    sales_returns: {
        fields: [
            { clientField: 'id', serverField: 'id' },
            { clientField: 'originalInvoiceId', serverField: 'original_invoice_id', transform: validateId },
            { clientField: 'invoiceId', serverField: 'original_invoice_id', transform: validateId },
            { clientField: 'customerId', serverField: 'customer_id', transform: validateId },
            { clientField: 'totalAmount', serverField: 'total_amount' },
            { clientField: 'total', serverField: 'total_amount' },
            { clientField: 'reason', serverField: 'reason' },
            { clientField: 'status', serverField: 'status', defaultValue: 'completed' },
            { clientField: 'createdAt', serverField: 'created_at', transform: toMySQLDateTime },
            { clientField: 'updatedAt', serverField: 'updated_at', transform: toMySQLDateTime },
        ],
        clientOnlyFields: ['local_updated_at', 'items', 'customerName', 'invoiceNumber'],
    },
};

// ==================== Transformation Functions ====================

export class FieldMapper {
    /**
     * Transform client data to server format
     */
    static clientToServer(
        tableName: string,
        clientData: Record<string, any>,
        clientId: string | number,
        branchId: string | number
    ): Record<string, any> {
        const mapping = TABLE_MAPPINGS[tableName];
        if (!mapping) {
            // No mapping defined - pass through with basic camelCase to snake_case conversion
            console.warn(`No field mapping defined for table: ${tableName}`);
            const serverData: Record<string, any> = { client_id: clientId, branch_id: branchId };
            for (const [key, value] of Object.entries(clientData)) {
                if (key === 'local_updated_at') continue;
                // Convert camelCase to snake_case
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                // Handle datetime
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                    serverData[snakeKey] = toMySQLDateTime(value);
                } else {
                    serverData[snakeKey] = value;
                }
            }
            return serverData;
        }

        const serverData: Record<string, any> = {};

        // Apply field mappings
        for (const fieldMap of mapping.fields) {
            const clientValue = clientData[fieldMap.clientField];

            if (clientValue !== undefined) {
                const transformedValue = fieldMap.transform
                    ? fieldMap.transform(clientValue)
                    : clientValue;

                // Only set if we have a value (transforms may return null to skip)
                if (transformedValue !== undefined) {
                    serverData[fieldMap.serverField] = transformedValue;
                }
            } else if (fieldMap.defaultValue !== undefined) {
                serverData[fieldMap.serverField] = typeof fieldMap.defaultValue === 'function'
                    ? fieldMap.defaultValue()
                    : fieldMap.defaultValue;
            }
        }

        // Add required server fields
        serverData.client_id = clientId;
        serverData.branch_id = branchId;

        // Add server defaults for missing fields
        if (mapping.serverDefaults) {
            for (const [field, defaultValue] of Object.entries(mapping.serverDefaults)) {
                if (serverData[field] === undefined) {
                    serverData[field] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
                }
            }
        }

        // Remove client-only fields
        if (mapping.clientOnlyFields) {
            for (const field of mapping.clientOnlyFields) {
                delete serverData[field];
            }
        }

        return serverData;
    }

    /**
     * Transform server data to client format
     */
    static serverToClient(
        tableName: string,
        serverData: Record<string, any>
    ): Record<string, any> {
        const mapping = TABLE_MAPPINGS[tableName];
        if (!mapping) {
            return serverData;
        }

        const clientData: Record<string, any> = {};

        // Reverse mapping
        for (const fieldMap of mapping.fields) {
            const serverValue = serverData[fieldMap.serverField];

            if (serverValue !== undefined) {
                clientData[fieldMap.clientField] = serverValue;
            }
        }

        // Remove server-only metadata fields
        delete clientData.client_id;
        delete clientData.branch_id;
        delete clientData.sync_version;
        delete clientData.server_updated_at;
        delete clientData.is_deleted;

        return clientData;
    }

    /**
     * Get list of all supported tables
     */
    static getSupportedTables(): string[] {
        return Object.keys(TABLE_MAPPINGS);
    }

    /**
     * Check if table has mapping defined
     */
    static hasMapping(tableName: string): boolean {
        return tableName in TABLE_MAPPINGS;
    }
}
