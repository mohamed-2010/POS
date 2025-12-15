// Types for the Admin Dashboard

// ==================== Auth ====================
export interface AdminUser {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: 'super_admin' | 'support' | 'viewer';
    permissions: string[];
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
}

// ==================== Clients ====================
export interface Client {
    id: string;
    name: string;
    nameEn?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    subscriptionPlan: string;
    subscriptionStatus: 'active' | 'suspended' | 'expired';
    subscriptionExpiresAt?: string;
    maxBranches: number;
    maxDevices: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Computed fields
    branchesCount?: number;
    licensesCount?: number;
    totalSales?: number;
}

export interface ClientStats {
    totalInvoices: number;
    totalSales: number;
    totalProducts: number;
    totalCustomers: number;
    activeBranches: number;
    activeLicenses: number;
}

// ==================== Branches ====================
export interface Branch {
    id: string;
    clientId: string;
    clientName?: string;
    name: string;
    nameEn?: string;
    address?: string;
    phone?: string;
    isMain: boolean;
    isActive: boolean;
    createdAt: string;
}

// ==================== Licenses ====================
export interface License {
    id: string;
    licenseKey: string;
    deviceId?: string;
    clientId: string;
    branchId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    activatedAt?: string;
    expiresAt?: string;
    lastVerifiedAt?: string;
    gracePeriodEndsAt?: string;
    isActive: boolean;
    maxDevices: number;
    notes?: string;
    createdAt: string;
    // Relations
    client?: Client;
    branch?: Branch;
}

// ==================== Subscriptions ====================
export interface SubscriptionPlan {
    id: string;
    name: string;
    nameAr?: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    maxBranches: number;
    maxDevices: number;
    maxProducts: number;
    features: string[];
    isActive: boolean;
    createdAt: string;
}

export interface PaymentHistory {
    id: string;
    clientId: string;
    planId?: string;
    amount: number;
    paymentMethod?: string;
    paymentReference?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    notes?: string;
    paymentDate?: string;
    createdAt: string;
}

// ==================== Reports ====================
export interface DashboardStats {
    totalClients: number;
    activeClients: number;
    totalBranches: number;
    totalLicenses: number;
    activeLicenses: number;
    monthlyRevenue: number;
    expiringLicenses: number;
    connectedDevices: number;
}

export interface RevenueData {
    month: string;
    revenue: number;
}

export interface ClientGrowthData {
    month: string;
    clients: number;
}

export interface TopClient {
    id: string;
    name: string;
    totalSales: number;
    invoicesCount: number;
}

// ==================== System ====================
export interface ConnectedDevice {
    deviceId: string;
    userId: number;
    clientId: number;
    branchId: number;
    connectedAt: string;
    lastPing: string;
}

export interface SyncQueueItem {
    id: string;
    clientId: string;
    deviceId: string;
    entityType: string;
    operation: 'create' | 'update' | 'delete';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    processedAt?: string;
}

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'down';
    database: boolean;
    websocket: boolean;
    uptime: number;
    memoryUsage: number;
}

// ==================== Audit Log ====================
export interface AuditLog {
    id: string;
    adminId: string;
    adminName: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
    createdAt: string;
}

// ==================== API ====================
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}
