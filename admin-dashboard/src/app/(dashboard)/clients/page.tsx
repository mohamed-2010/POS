'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users,
    Plus,
    Search,
    MoreHorizontal,
    Eye,
    Pencil,
    Trash2,
    Building2,
    Key,
    Loader2,
    Power,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Client } from '@/types';

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, totalBranches: 0 });

    const fetchClients = async (search?: string) => {
        try {
            setIsLoading(true);
            const res = await api.get('/clients', {
                params: { search, limit: 50 },
            });
            const rawData = res.data.data || [];

            // Map snake_case API response to camelCase for frontend
            const data = rawData.map((c: any) => ({
                id: c.id,
                name: c.name,
                nameEn: c.name_en,
                email: c.email,
                phone: c.phone,
                address: c.address,
                taxNumber: c.tax_number,
                subscriptionPlan: c.subscription_plan,
                subscriptionStatus: c.subscription_status,
                subscriptionExpiresAt: c.subscription_expires_at,
                maxBranches: c.max_branches,
                maxDevices: c.max_devices,
                isActive: c.is_active === 1 || c.is_active === true,
                createdAt: c.created_at,
                updatedAt: c.updated_at,
                branchesCount: c.branches_count || 0,
                licensesCount: c.licenses_count || 0,
            }));

            setClients(data);

            // Calculate stats
            const active = data.filter((c: Client) => c.isActive).length;
            const totalBranches = data.reduce((acc: number, c: Client) => acc + (c.branchesCount || 0), 0);
            setStats({
                total: res.data.total || data.length,
                active,
                inactive: data.length - active,
                totalBranches,
            });
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchClients(searchQuery);
    };

    const toggleClientStatus = async (clientId: string) => {
        try {
            await api.put(`/clients/${clientId}/status`);
            fetchClients(searchQuery);
        } catch (error) {
            console.error('Error toggling client status:', error);
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا التاجر؟')) return;
        try {
            await api.delete(`/clients/${clientId}`);
            fetchClients(searchQuery);
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        إدارة التجار
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة جميع التجار المسجلين في النظام
                    </p>
                </div>
                <Button asChild>
                    <Link href="/clients/new">
                        <Plus className="ml-2 h-4 w-4" />
                        إضافة تاجر جديد
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-sm text-muted-foreground">إجمالي التجار</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-500">{stats.active}</div>
                        <p className="text-sm text-muted-foreground">نشط</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-500">{stats.inactive}</div>
                        <p className="text-sm text-muted-foreground">موقوف</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.totalBranches}</div>
                        <p className="text-sm text-muted-foreground">إجمالي الفروع</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>قائمة التجار</CardTitle>
                        <form onSubmit={handleSearch} className="relative w-64">
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="بحث..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-9"
                            />
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            لا يوجد تجار
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>التاجر</TableHead>
                                    <TableHead>التواصل</TableHead>
                                    <TableHead>الخطة</TableHead>
                                    <TableHead>الفروع</TableHead>
                                    <TableHead>التراخيص</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>تاريخ التسجيل</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{client.email || '-'}</div>
                                                <div className="text-muted-foreground">{client.phone || '-'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{client.subscriptionPlan || 'Basic'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                {client.branchesCount || 0}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Key className="h-4 w-4 text-muted-foreground" />
                                                {client.licensesCount || 0}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={client.isActive ? 'default' : 'destructive'}>
                                                {client.isActive ? 'نشط' : 'موقوف'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {client.createdAt ? new Date(client.createdAt).toLocaleDateString('ar-EG') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/clients/${client.id}`}>
                                                            <Eye className="ml-2 h-4 w-4" />
                                                            عرض التفاصيل
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/clients/${client.id}/edit`}>
                                                            <Pencil className="ml-2 h-4 w-4" />
                                                            تعديل
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleClientStatus(client.id)}>
                                                        <Power className="ml-2 h-4 w-4" />
                                                        {client.isActive ? 'إيقاف' : 'تفعيل'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => deleteClient(client.id)}
                                                    >
                                                        <Trash2 className="ml-2 h-4 w-4" />
                                                        حذف
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
        </div>
    );
}
