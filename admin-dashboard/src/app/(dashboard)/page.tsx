'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Building2,
    Key,
    DollarSign,
    TrendingUp,
    AlertCircle,
    Monitor,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import type { DashboardStats, Client, License } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentClients, setRecentClients] = useState<Client[]>([]);
    const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch dashboard stats
                const statsRes = await api.get('/dashboard');
                setStats(statsRes.data);

                // Fetch recent clients
                const clientsRes = await api.get('/clients', { params: { limit: 5 } });
                setRecentClients(clientsRes.data.data || []);

                // Fetch expiring licenses - use the same licenses endpoint with filter
                const licensesRes = await api.get('/licenses', { params: { status: 'expiring', limit: 5 } });
                setExpiringLicenses(licensesRes.data.data || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
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

    const statsCards = [
        {
            title: 'إجمالي التجار',
            value: stats?.totalClients || 0,
            subValue: `${stats?.activeClients || 0} نشط`,
            icon: Users,
        },
        {
            title: 'الفروع',
            value: stats?.totalBranches || 0,
            icon: Building2,
        },
        {
            title: 'التراخيص المفعلة',
            value: stats?.activeLicenses || 0,
            subValue: `من ${stats?.totalLicenses || 0}`,
            icon: Key,
        },
        {
            title: 'إيرادات الشهر',
            value: `${(stats?.monthlyRevenue || 0).toLocaleString()} ج.م`,
            icon: DollarSign,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold">مرحباً، {user?.fullName || 'مدير النظام'}</h1>
                <p className="text-muted-foreground mt-1">
                    إليك نظرة عامة على نظامك اليوم
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            {stat.subValue && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stat.subValue}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Clients */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            آخر التجار المسجلين
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentClients.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">لا يوجد تجار</p>
                        ) : (
                            <div className="space-y-4">
                                {recentClients.map((client) => (
                                    <Link
                                        key={client.id}
                                        href={`/clients/${client.id}`}
                                        className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg transition-colors"
                                    >
                                        <div>
                                            <p className="font-medium">{client.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {client.subscriptionPlan || 'Basic'}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={client.isActive ? 'default' : 'secondary'}
                                        >
                                            {client.isActive ? 'نشط' : 'غير نشط'}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Expiring Licenses */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            تراخيص تنتهي قريباً ({stats?.expiringLicenses || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expiringLicenses.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">لا يوجد تراخيص تنتهي قريباً</p>
                        ) : (
                            <div className="space-y-4">
                                {expiringLicenses.map((license) => (
                                    <div
                                        key={license.id}
                                        className="flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-medium">{license.customerName || 'غير محدد'}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {license.licenseKey}
                                            </p>
                                        </div>
                                        <Badge variant="destructive">
                                            {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('ar-EG') : '-'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Connected Devices */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="h-5 w-5" />
                            الأجهزة المتصلة حالياً ({stats?.connectedDevices || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <div className="text-center">
                                <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>سيتم عرض الأجهزة المتصلة هنا</p>
                                <p className="text-sm">بعد ربط الـ WebSocket</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
