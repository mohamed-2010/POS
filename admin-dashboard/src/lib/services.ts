import api from './api';
import type {
    Client,
    ClientStats,
    License,
    DashboardStats,
    PaginatedResponse,
} from '@/types';

// ==================== Dashboard ====================
export const dashboardService = {
    async getStats(): Promise<DashboardStats> {
        const response = await api.get<DashboardStats>('/dashboard');
        return response.data;
    },
};

// ==================== Clients ====================
export const clientsService = {
    async getAll(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
    }): Promise<PaginatedResponse<Client>> {
        const response = await api.get<PaginatedResponse<Client>>('/clients', { params });
        return response.data;
    },

    async getById(id: string): Promise<Client> {
        const response = await api.get<Client>(`/clients/${id}`);
        return response.data;
    },

    async getStats(id: string): Promise<ClientStats> {
        const response = await api.get<ClientStats>(`/clients/${id}/stats`);
        return response.data;
    },

    async create(data: Partial<Client>): Promise<{ id: string }> {
        const response = await api.post<{ id: string }>('/clients', data);
        return response.data;
    },

    async update(id: string, data: Partial<Client>): Promise<void> {
        await api.put(`/clients/${id}`, data);
    },

    async toggleStatus(id: string): Promise<void> {
        await api.put(`/clients/${id}/status`);
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/clients/${id}`);
    },
};

// ==================== Licenses ====================
export const licensesService = {
    async getAll(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        clientId?: string;
    }): Promise<PaginatedResponse<License>> {
        const response = await api.get<PaginatedResponse<License>>('/licenses', { params });
        return response.data;
    },

    async getById(id: string): Promise<License> {
        const response = await api.get<License>(`/licenses/${id}`);
        return response.data;
    },

    async create(data: {
        clientId: string;
        branchId?: string;
        expiresAt?: string;
        maxDevices?: number;
        notes?: string;
    }): Promise<{ id: string; licenseKey: string }> {
        const response = await api.post<{ id: string; licenseKey: string }>('/licenses', data);
        return response.data;
    },

    async generateBulk(data: {
        clientId: string;
        count: number;
        expiresAt?: string;
        maxDevices?: number;
    }): Promise<{ licenses: { id: string; licenseKey: string }[] }> {
        const response = await api.post<{ licenses: { id: string; licenseKey: string }[] }>(
            '/licenses/generate',
            data
        );
        return response.data;
    },

    async renew(id: string, data: { months?: number; expiresAt?: string }): Promise<void> {
        await api.post(`/licenses/${id}/renew`, data);
    },

    async revoke(id: string): Promise<void> {
        await api.post(`/licenses/${id}/revoke`);
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/licenses/${id}`);
    },
};

// ==================== Auth ====================
export const authService = {
    async login(credentials: { username: string; password: string }) {
        const response = await api.post('/login', credentials);
        return response.data;
    },

    async updateProfile(data: { fullName?: string; email?: string }) {
        const response = await api.put('/profile', data);
        return response.data;
    },

    async changePassword(data: { currentPassword: string; newPassword: string }) {
        const response = await api.put('/password', data);
        return response.data;
    },
};
