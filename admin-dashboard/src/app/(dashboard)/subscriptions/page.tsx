'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CreditCard,
    Search,
    MoreHorizontal,
    Calendar,
    AlertCircle,
    RefreshCw,
    Loader2,
    Key,
} from 'lucide-react';
import api from '@/lib/api';

interface License {
    id: string;
    license_key: string;
    client_id: string;
    client_name: string;
    is_active: boolean;
    activated_at: string | null;
    expires_at: string | null;
    created_at: string;
}

interface DashboardStats {
    totalLicenses: number;
    activeLicenses: number;
    expiringLicenses: number;
}

export default function SubscriptionsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);

            const [licensesRes, statsRes] = await Promise.all([
                api.get('/licenses', { params: { limit: 50 } }),
                api.get('/dashboard'),
            ]);

            const rawLicenses = licensesRes.data.data || [];
            setLicenses(rawLicenses);
            setStats(statsRes.data);

            // Filter expiring licenses (within 30 days)
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const expiring = rawLicenses.filter((l: License) => {
                if (!l.expires_at) return false;
                const expiryDate = new Date(l.expires_at);
                return expiryDate > now && expiryDate <= thirtyDaysFromNow;
            });
            setExpiringLicenses(expiring);
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredLicenses = licenses.filter((license) =>
        (license.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        license.license_key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renewLicense = async (licenseId: string) => {
        try {
            await api.post(`/licenses/${licenseId}/renew`, { months: 12 });
            fetchData();
        } catch (error) {
            console.error('Error renewing license:', error);
        }
    };

    const getDaysUntilExpiry = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

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
                    <CreditCard className="h-8 w-8" />
                    إدارة الاشتراكات
                </h1>
                <p className="text-muted-foreground mt-1">
                    متابعة وإدارة اشتراكات التجار
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats?.totalLicenses || 0}</div>
                        <p className="text-sm text-muted-foreground">إجمالي التراخيص</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-500">
                            {stats?.activeLicenses || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">نشط</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-500">
                            {stats?.expiringLicenses || expiringLicenses.length}
                        </div>
                        <p className="text-sm text-muted-foreground">ينتهي قريباً</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-500">
                            {licenses.filter(l => !l.is_active).length}
                        </div>
                        <p className="text-sm text-muted-foreground">غير نشط</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">جميع التراخيص</TabsTrigger>
                    <TabsTrigger value="expiring">
                        ينتهي قريباً ({expiringLicenses.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>قائمة التراخيص</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="بحث..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pr-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredLicenses.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">لا يوجد تراخيص</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>التاجر</TableHead>
                                            <TableHead>مفتاح الترخيص</TableHead>
                                            <TableHead>تاريخ التفعيل</TableHead>
                                            <TableHead>تاريخ الانتهاء</TableHead>
                                            <TableHead>الحالة</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLicenses.map((license) => (
                                            <TableRow key={license.id}>
                                                <TableCell className="font-medium">
                                                    {license.client_name || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                                        {license.license_key}
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    {license.activated_at
                                                        ? new Date(license.activated_at).toLocaleDateString('ar-EG')
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {license.expires_at
                                                        ? new Date(license.expires_at).toLocaleDateString('ar-EG')
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {license.is_active ? (
                                                        <Badge className="bg-green-500">نشط</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">منتهي</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => renewLicense(license.id)}>
                                                                <RefreshCw className="ml-2 h-4 w-4" />
                                                                تجديد (سنة)
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <Calendar className="ml-2 h-4 w-4" />
                                                                تمديد
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expiring">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-500" />
                                تراخيص تنتهي خلال 30 يوم
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expiringLicenses.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    لا يوجد تراخيص تنتهي قريباً
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {expiringLicenses.map((license) => (
                                        <div
                                            key={license.id}
                                            className="flex items-center justify-between p-4 rounded-lg border"
                                        >
                                            <div>
                                                <p className="font-medium">{license.client_name || 'غير محدد'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    <Key className="inline h-3 w-3 ml-1" />
                                                    {license.license_key} - ينتهي في{' '}
                                                    {license.expires_at
                                                        ? new Date(license.expires_at).toLocaleDateString('ar-EG')
                                                        : '-'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="destructive">
                                                    {license.expires_at ? getDaysUntilExpiry(license.expires_at) : 0} يوم متبقي
                                                </Badge>
                                                <Button size="sm" onClick={() => renewLicense(license.id)}>
                                                    <RefreshCw className="ml-2 h-4 w-4" />
                                                    تجديد
                                                </Button>
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
