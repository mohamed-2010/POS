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
    Building2,
    Search,
    MoreHorizontal,
    Eye,
    Pencil,
    Power,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Branch } from '@/types';

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ total: 0, active: 0, main: 0 });

    const fetchBranches = async (search?: string) => {
        try {
            setIsLoading(true);
            const res = await api.get('/branches', {
                params: { search, limit: 50 },
            });
            const data = res.data.data || res.data || [];
            setBranches(Array.isArray(data) ? data : []);

            // Calculate stats
            const active = data.filter((b: Branch) => b.isActive).length;
            const main = data.filter((b: Branch) => b.isMain).length;
            setStats({
                total: res.data.total || data.length,
                active,
                main,
            });
        } catch (error) {
            console.error('Error fetching branches:', error);
            setBranches([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchBranches(searchQuery);
    };

    const toggleBranchStatus = async (branchId: string) => {
        try {
            await api.put(`/branches/${branchId}/status`);
            fetchBranches(searchQuery);
        } catch (error) {
            console.error('Error toggling branch status:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Building2 className="h-8 w-8" />
                    إدارة الفروع
                </h1>
                <p className="text-muted-foreground mt-1">
                    عرض جميع فروع التجار
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-sm text-muted-foreground">إجمالي الفروع</p>
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
                        <div className="text-2xl font-bold text-blue-500">{stats.main}</div>
                        <p className="text-sm text-muted-foreground">فروع رئيسية</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>قائمة الفروع</CardTitle>
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
                    ) : branches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            لا يوجد فروع
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الفرع</TableHead>
                                    <TableHead>التاجر</TableHead>
                                    <TableHead>العنوان</TableHead>
                                    <TableHead>الهاتف</TableHead>
                                    <TableHead>النوع</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {branches.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="font-medium">{branch.name}</TableCell>
                                        <TableCell>{branch.clientName || '-'}</TableCell>
                                        <TableCell>{branch.address || '-'}</TableCell>
                                        <TableCell dir="ltr" className="text-right">{branch.phone || '-'}</TableCell>
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
                                                        <Link href={`/clients/${branch.clientId}`}>
                                                            <Eye className="ml-2 h-4 w-4" />
                                                            عرض التاجر
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Pencil className="ml-2 h-4 w-4" />
                                                        تعديل
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleBranchStatus(branch.id)}>
                                                        <Power className="ml-2 h-4 w-4" />
                                                        {branch.isActive ? 'تعطيل' : 'تفعيل'}
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
