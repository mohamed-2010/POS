'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Monitor,
    Server,
    Database,
    Wifi,
    Activity,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    Loader2,
    Key,
    Users,
    Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface DashboardStats {
    totalClients: number;
    activeClients: number;
    totalBranches: number;
    totalLicenses: number;
    activeLicenses: number;
    expiringLicenses: number;
}

interface License {
    id: string;
    license_key: string;
    device_id: string | null;
    client_name: string;
    activated_at: string | null;
    last_verified_at: string | null;
    is_active: boolean;
}

export default function SystemPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activeLicenses, setActiveLicenses] = useState<License[]>([]);
    const [systemStatus, setSystemStatus] = useState({
        database: true,
        websocket: true,
    });

    const fetchData = async () => {
        try {
            setIsLoading(true);

            // Fetch dashboard stats
            const [statsRes, licensesRes] = await Promise.all([
                api.get('/dashboard'),
                api.get('/licenses', { params: { limit: 10, status: 'active' } }),
            ]);

            setStats(statsRes.data);
            setActiveLicenses(licensesRes.data.data || []);

            // System is working if we got here
            setSystemStatus({ database: true, websocket: true });
        } catch (error) {
            console.error('Error fetching system data:', error);
            setSystemStatus({ database: false, websocket: false });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Filter licenses with devices (connected)
    const connectedDevices = activeLicenses.filter(l => l.device_id);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Monitor className="h-8 w-8" />
                        مراقبة النظام
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        حالة النظام والأجهزة المتصلة
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    تحديث
                </Button>
            </div>

            {/* System Health */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            حالة النظام
                        </CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {systemStatus.database ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-xl font-bold text-green-500">سليم</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-xl font-bold text-red-500">مشكلة</span>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            التجار النشطين
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {stats?.activeClients || 0} / {stats?.totalClients || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            قاعدة البيانات
                        </CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {systemStatus.database ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-green-500 font-medium">متصل</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-red-500 font-medium">غير متصل</span>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            الأجهزة المتصلة
                        </CardTitle>
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-500">
                            {connectedDevices.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        ملخص النظام
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <Building2 className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي الفروع</p>
                                <p className="text-2xl font-bold">{stats?.totalBranches || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <Key className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">التراخيص النشطة</p>
                                <p className="text-2xl font-bold">{stats?.activeLicenses || 0} / {stats?.totalLicenses || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <Clock className="h-8 w-8 text-orange-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">تنتهي قريباً</p>
                                <p className="text-2xl font-bold text-orange-500">{stats?.expiringLicenses || 0}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Connected Devices */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5" />
                        الأجهزة المتصلة ({connectedDevices.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {connectedDevices.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">لا يوجد أجهزة متصلة حالياً</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>معرف الجهاز</TableHead>
                                    <TableHead>التاجر</TableHead>
                                    <TableHead>مفتاح الترخيص</TableHead>
                                    <TableHead>آخر تحقق</TableHead>
                                    <TableHead>الحالة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {connectedDevices.map((license) => (
                                    <TableRow key={license.id}>
                                        <TableCell>
                                            <code className="text-sm bg-muted px-2 py-1 rounded">
                                                {license.device_id?.substring(0, 16)}...
                                            </code>
                                        </TableCell>
                                        <TableCell>{license.client_name || '-'}</TableCell>
                                        <TableCell>
                                            <code className="text-xs">{license.license_key}</code>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {license.last_verified_at
                                                ? new Date(license.last_verified_at).toLocaleString('ar-EG')
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-500">متصل</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
