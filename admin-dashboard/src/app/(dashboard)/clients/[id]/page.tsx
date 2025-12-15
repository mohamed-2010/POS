'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowRight,
    Building2,
    Key,
    DollarSign,
    Package,
    Users as UsersIcon,
    FileText,
    Pencil,
    Plus,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Client, ClientStats, Branch, License } from '@/types';

export default function ClientDetailsPage() {
    const params = useParams();
    const clientId = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [stats, setStats] = useState<ClientStats | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch client details
                const clientRes = await api.get(`/clients/${clientId}`);
                setClient(clientRes.data);

                // Fetch client stats
                const statsRes = await api.get(`/clients/${clientId}/stats`);
                setStats(statsRes.data);

                // Fetch branches
                try {
                    const branchesRes = await api.get(`/branches`, { params: { clientId } });
                    setBranches(branchesRes.data.data || []);
                } catch (e) {
                    // Branches API might not exist yet
                    console.log('Branches API not available');
                }

                // Fetch licenses
                try {
                    const licensesRes = await api.get(`/licenses`, { params: { clientId } });
                    setLicenses(licensesRes.data.data || []);
                } catch (e) {
                    console.log('Licenses API error');
                }
            } catch (error) {
                console.error('Error fetching client details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (clientId) {
            fetchData();
        }
    }, [clientId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                التاجر غير موجود
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/clients">
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{client.name}</h1>
                        <p className="text-muted-foreground">{client.email || '-'}</p>
                    </div>
                    <Badge variant={client.isActive ? 'default' : 'destructive'}>
                        {client.isActive ? 'نشط' : 'موقوف'}
                    </Badge>
                </div>
                <Button asChild>
                    <Link href={`/clients/${clientId}/edit`}>
                        <Pencil className="ml-2 h-4 w-4" />
                        تعديل
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">الفواتير</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{stats?.totalInvoices || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">المبيعات</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{(stats?.totalSales || 0).toLocaleString()} ج.م</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">المنتجات</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{stats?.totalProducts || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">العملاء</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{stats?.totalCustomers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">الفروع</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{stats?.activeBranches || client.branchesCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">التراخيص</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{stats?.activeLicenses || client.licensesCount || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="info">المعلومات</TabsTrigger>
                    <TabsTrigger value="branches">الفروع ({branches.length})</TabsTrigger>
                    <TabsTrigger value="licenses">التراخيص ({licenses.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardHeader>
                            <CardTitle>معلومات التاجر</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-muted-foreground">الاسم بالعربية</label>
                                        <p className="font-medium">{client.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">الاسم بالإنجليزية</label>
                                        <p className="font-medium">{client.nameEn || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">البريد الإلكتروني</label>
                                        <p className="font-medium">{client.email || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">الهاتف</label>
                                        <p className="font-medium">{client.phone || '-'}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-muted-foreground">العنوان</label>
                                        <p className="font-medium">{client.address || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">الرقم الضريبي</label>
                                        <p className="font-medium">{client.taxNumber || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">خطة الاشتراك</label>
                                        <p className="font-medium">
                                            <Badge variant="outline">{client.subscriptionPlan || 'Basic'}</Badge>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">تاريخ التسجيل</label>
                                        <p className="font-medium">
                                            {client.createdAt ? new Date(client.createdAt).toLocaleDateString('ar-EG') : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="branches">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>الفروع</CardTitle>
                            <Button size="sm">
                                <Plus className="ml-2 h-4 w-4" />
                                إضافة فرع
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {branches.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">لا يوجد فروع</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>اسم الفرع</TableHead>
                                            <TableHead>العنوان</TableHead>
                                            <TableHead>النوع</TableHead>
                                            <TableHead>الحالة</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {branches.map((branch) => (
                                            <TableRow key={branch.id}>
                                                <TableCell className="font-medium">{branch.name}</TableCell>
                                                <TableCell>{branch.address || '-'}</TableCell>
                                                <TableCell>
                                                    {branch.isMain ? (
                                                        <Badge>رئيسي</Badge>
                                                    ) : (
                                                        <Badge variant="outline">فرعي</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                                                        {branch.isActive ? 'نشط' : 'غير نشط'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="licenses">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>التراخيص</CardTitle>
                            <Button size="sm" asChild>
                                <Link href={`/licenses?clientId=${clientId}`}>
                                    <Plus className="ml-2 h-4 w-4" />
                                    إنشاء ترخيص
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {licenses.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">لا يوجد تراخيص</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>مفتاح الترخيص</TableHead>
                                            <TableHead>الحالة</TableHead>
                                            <TableHead>تاريخ الانتهاء</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {licenses.map((license) => (
                                            <TableRow key={license.id}>
                                                <TableCell>
                                                    <code className="text-sm bg-muted px-2 py-1 rounded">
                                                        {license.licenseKey}
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={license.isActive ? 'bg-green-500' : ''}>
                                                        {license.isActive ? 'نشط' : 'غير نشط'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('ar-EG') : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
