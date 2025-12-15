'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart3,
    TrendingUp,
    Users,
    DollarSign,
    Calendar,
    Loader2,
    Key,
    Building2,
} from 'lucide-react';
import api from '@/lib/api';

interface DashboardStats {
    totalClients: number;
    activeClients: number;
    totalBranches: number;
    totalLicenses: number;
    activeLicenses: number;
    expiringLicenses: number;
}

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    is_active: boolean;
    created_at: string;
}

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [clients, setClients] = useState<Client[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch dashboard stats
                const [statsRes, clientsRes] = await Promise.all([
                    api.get('/dashboard'),
                    api.get('/clients', { params: { limit: 10 } }),
                ]);

                setStats(statsRes.data);
                setClients(clientsRes.data.data || []);
            } catch (error) {
                console.error('Error fetching reports data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-8 w-8" />
                    التقارير والإحصائيات
                </h1>
                <p className="text-muted-foreground mt-1">
                    نظرة شاملة على أداء النظام
                </p>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            إجمالي التجار
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <span className="text-green-500">{stats?.activeClients || 0}</span>
                            نشط
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            إجمالي الفروع
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalBranches || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            فرع مسجل
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            إجمالي التراخيص
                        </CardTitle>
                        <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalLicenses || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <span className="text-green-500">{stats?.activeLicenses || 0}</span>
                            نشط
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            تراخيص قاربت على الانتهاء
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{stats?.expiringLicenses || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            خلال 7 أيام
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                    <TabsTrigger value="clients">التجار</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>ملخص النظام</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <span className="text-muted-foreground">نسبة التجار النشطين</span>
                                        <span className="font-bold text-green-500">
                                            {stats?.totalClients
                                                ? Math.round((stats.activeClients / stats.totalClients) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <span className="text-muted-foreground">نسبة التراخيص النشطة</span>
                                        <span className="font-bold text-green-500">
                                            {stats?.totalLicenses
                                                ? Math.round((stats.activeLicenses / stats.totalLicenses) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <span className="text-muted-foreground">متوسط الفروع لكل تاجر</span>
                                        <span className="font-bold">
                                            {stats?.totalClients
                                                ? (stats.totalBranches / stats.totalClients).toFixed(1)
                                                : 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <span className="text-muted-foreground">متوسط التراخيص لكل تاجر</span>
                                        <span className="font-bold">
                                            {stats?.totalClients
                                                ? (stats.totalLicenses / stats.totalClients).toFixed(1)
                                                : 0}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>حالة التراخيص</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="w-24 text-sm text-muted-foreground">نشط</span>
                                        <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full transition-all"
                                                style={{
                                                    width: stats?.totalLicenses
                                                        ? `${(stats.activeLicenses / stats.totalLicenses) * 100}%`
                                                        : '0%',
                                                }}
                                            />
                                        </div>
                                        <span className="w-12 text-sm font-medium">{stats?.activeLicenses || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="w-24 text-sm text-muted-foreground">قارب على الانتهاء</span>
                                        <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 rounded-full transition-all"
                                                style={{
                                                    width: stats?.totalLicenses
                                                        ? `${(stats.expiringLicenses / stats.totalLicenses) * 100}%`
                                                        : '0%',
                                                }}
                                            />
                                        </div>
                                        <span className="w-12 text-sm font-medium">{stats?.expiringLicenses || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="w-24 text-sm text-muted-foreground">غير نشط</span>
                                        <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full transition-all"
                                                style={{
                                                    width: stats?.totalLicenses
                                                        ? `${((stats.totalLicenses - stats.activeLicenses) / stats.totalLicenses) * 100}%`
                                                        : '0%',
                                                }}
                                            />
                                        </div>
                                        <span className="w-12 text-sm font-medium">
                                            {(stats?.totalLicenses || 0) - (stats?.activeLicenses || 0)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="clients">
                    <Card>
                        <CardHeader>
                            <CardTitle>آخر التجار المسجلين</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {clients.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">لا يوجد تجار مسجلين</p>
                            ) : (
                                <div className="space-y-4">
                                    {clients.map((client, index) => (
                                        <div
                                            key={client.id}
                                            className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium">{client.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {client.email || client.phone || 'بدون بيانات اتصال'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm px-2 py-1 rounded ${client.is_active
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {client.is_active ? 'نشط' : 'غير نشط'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
