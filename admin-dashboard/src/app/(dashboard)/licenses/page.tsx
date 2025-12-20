'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Key,
    Plus,
    Search,
    MoreHorizontal,
    Copy,
    RefreshCw,
    XCircle,
    Trash2,
    Loader2,
    Check,
    Settings,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';
import type { License } from '@/types';

export default function LicensesPage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, unused: 0 });

    // Clients for dropdown
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

    // Create license dialog state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newLicense, setNewLicense] = useState({
        clientId: '',
        expiresAt: '',
        maxDevices: 1,
        notes: '',
        // Sync settings
        syncInterval: 300000, // 5 minutes default
        enableSync: true,
        enableOfflineMode: false,
        autoUpdate: true,
    });

    // Fetch clients for dropdown
    const fetchClients = async () => {
        try {
            const res = await api.get('/clients', { params: { limit: 100 } });
            const rawData = res.data.data || [];
            setClients(rawData.map((c: any) => ({ id: c.id, name: c.name })));
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchLicenses = async () => {
        try {
            setIsLoading(true);
            const params: any = { limit: 50 };
            if (searchQuery) params.search = searchQuery;
            if (statusFilter !== 'all') params.status = statusFilter;

            const res = await api.get('/licenses', { params });
            const rawData = res.data.data || [];

            // Map snake_case API response to camelCase for frontend
            const data = rawData.map((l: any) => ({
                id: l.id,
                licenseKey: l.license_key,
                deviceId: l.device_id,
                clientId: l.client_id,
                branchId: l.branch_id,
                customerName: l.customer_name || l.client_name,
                customerEmail: l.customer_email,
                customerPhone: l.customer_phone,
                activatedAt: l.activated_at,
                expiresAt: l.expires_at,
                lastVerifiedAt: l.last_verified_at,
                gracePeriodEndsAt: l.grace_period_ends_at,
                isActive: l.is_active === 1 || l.is_active === true,
                maxDevices: l.max_devices,
                notes: l.notes,
                createdAt: l.created_at,
                updatedAt: l.updated_at,
                clientName: l.client_name,
                branchName: l.branch_name,
            }));

            setLicenses(data);

            // Calculate stats
            const now = new Date();
            const active = data.filter((l: License) => l.isActive && (!l.expiresAt || new Date(l.expiresAt) > now)).length;
            const expired = data.filter((l: License) => l.expiresAt && new Date(l.expiresAt) <= now).length;
            const unused = data.filter((l: License) => !l.deviceId).length;
            setStats({
                total: res.data.total || data.length,
                active,
                expired,
                unused,
            });
        } catch (error) {
            console.error('Error fetching licenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenses();
    }, [statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLicenses();
    };

    const copyToClipboard = (key: string, id: string) => {
        navigator.clipboard.writeText(key);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const renewLicense = async (licenseId: string) => {
        try {
            await api.post(`/licenses/${licenseId}/renew`, { months: 12 });
            fetchLicenses();
        } catch (error) {
            console.error('Error renewing license:', error);
        }
    };

    const revokeLicense = async (licenseId: string) => {
        if (!confirm('هل أنت متأكد من إلغاء هذا الترخيص؟')) return;
        try {
            await api.post(`/licenses/${licenseId}/revoke`);
            fetchLicenses();
        } catch (error) {
            console.error('Error revoking license:', error);
        }
    };

    const deleteLicense = async (licenseId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الترخيص؟')) return;
        try {
            await api.delete(`/licenses/${licenseId}`);
            fetchLicenses();
        } catch (error) {
            console.error('Error deleting license:', error);
        }
    };

    const createLicense = async () => {
        try {
            setIsCreating(true);
            // Calculate expiry date (1 year from now if not specified)
            const expiresAt = newLicense.expiresAt ||
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            await api.post('/licenses', {
                clientId: newLicense.clientId,
                expiresAt,
                maxDevices: newLicense.maxDevices,
                notes: newLicense.notes || null,
                // Sync settings
                syncInterval: newLicense.syncInterval,
                enableSync: newLicense.enableSync,
                enableOfflineMode: newLicense.enableOfflineMode,
                autoUpdate: newLicense.autoUpdate,
            });

            setShowCreateDialog(false);
            setNewLicense({
                clientId: '',
                expiresAt: '',
                maxDevices: 1,
                notes: '',
                syncInterval: 300000,
                enableSync: true,
                enableOfflineMode: false,
                autoUpdate: true,
            });
            fetchLicenses();
        } catch (error) {
            console.error('Error creating license:', error);
            alert('حدث خطأ أثناء إنشاء الترخيص');
        } finally {
            setIsCreating(false);
        }
    };

    const getLicenseStatus = (license: License) => {
        if (!license.isActive) return { label: 'ملغي', variant: 'destructive' as const };
        if (license.expiresAt && new Date(license.expiresAt) <= new Date()) {
            return { label: 'منتهي', variant: 'destructive' as const };
        }
        if (!license.deviceId) return { label: 'غير مستخدم', variant: 'secondary' as const };
        return { label: 'نشط', variant: 'default' as const };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Key className="h-8 w-8" />
                        إدارة التراخيص
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إنشاء وإدارة تراخيص النظام
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="ml-2 h-4 w-4" />
                    إنشاء ترخيص
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-sm text-muted-foreground">إجمالي التراخيص</p>
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
                        <div className="text-2xl font-bold text-red-500">{stats.expired}</div>
                        <p className="text-sm text-muted-foreground">منتهي</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-500">{stats.unused}</div>
                        <p className="text-sm text-muted-foreground">غير مستخدم</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle>قائمة التراخيص</CardTitle>
                        <div className="flex gap-2">
                            <form onSubmit={handleSearch} className="relative w-64">
                                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="بحث..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pr-9"
                                />
                            </form>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="الحالة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">الكل</SelectItem>
                                    <SelectItem value="active">نشط</SelectItem>
                                    <SelectItem value="expired">منتهي</SelectItem>
                                    <SelectItem value="unused">غير مستخدم</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : licenses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            لا يوجد تراخيص
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>مفتاح الترخيص</TableHead>
                                    <TableHead>التاجر</TableHead>
                                    <TableHead>الجهاز</TableHead>
                                    <TableHead>تاريخ الانتهاء</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {licenses.map((license) => {
                                    const status = getLicenseStatus(license);
                                    return (
                                        <TableRow key={license.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm bg-muted px-2 py-1 rounded">
                                                        {license.licenseKey}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => copyToClipboard(license.licenseKey, license.id)}
                                                    >
                                                        {copiedId === license.id ? (
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>{license.customerName || '-'}</TableCell>
                                            <TableCell>
                                                {license.deviceId ? (
                                                    <code className="text-xs">{license.deviceId}</code>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {license.expiresAt
                                                    ? new Date(license.expiresAt).toLocaleDateString('ar-EG')
                                                    : 'غير محدد'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.label}</Badge>
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
                                                        <DropdownMenuItem onClick={() => renewLicense(license.id)}>
                                                            <RefreshCw className="ml-2 h-4 w-4" />
                                                            تجديد (سنة)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => revokeLicense(license.id)}>
                                                            <XCircle className="ml-2 h-4 w-4" />
                                                            إلغاء
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => deleteLicense(license.id)}
                                                        >
                                                            <Trash2 className="ml-2 h-4 w-4" />
                                                            حذف
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create License Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>إنشاء ترخيص جديد</DialogTitle>
                        <DialogDescription>
                            أدخل بيانات الترخيص الجديد
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="clientId">التاجر *</Label>
                            <Select
                                value={newLicense.clientId}
                                onValueChange={(value) => setNewLicense({ ...newLicense, clientId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر التاجر" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="expiresAt">تاريخ الانتهاء</Label>
                                <Input
                                    id="expiresAt"
                                    type="date"
                                    value={newLicense.expiresAt}
                                    onChange={(e) => setNewLicense({ ...newLicense, expiresAt: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="maxDevices">عدد الأجهزة</Label>
                                <Input
                                    id="maxDevices"
                                    type="number"
                                    min={1}
                                    value={newLicense.maxDevices}
                                    onChange={(e) => setNewLicense({ ...newLicense, maxDevices: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">ملاحظات</Label>
                            <Input
                                id="notes"
                                value={newLicense.notes}
                                onChange={(e) => setNewLicense({ ...newLicense, notes: e.target.value })}
                                placeholder="ملاحظات إضافية..."
                            />
                        </div>

                        {/* Sync Settings Section */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium">إعدادات المزامنة</span>
                            </div>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="syncInterval">فترة المزامنة</Label>
                                    <Select
                                        value={String(newLicense.syncInterval)}
                                        onValueChange={(value) => setNewLicense({ ...newLicense, syncInterval: parseInt(value) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الفترة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="60000">كل دقيقة</SelectItem>
                                            <SelectItem value="180000">كل 3 دقائق</SelectItem>
                                            <SelectItem value="300000">كل 5 دقائق</SelectItem>
                                            <SelectItem value="600000">كل 10 دقائق</SelectItem>
                                            <SelectItem value="1800000">كل 30 دقيقة</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="enableSync">تفعيل المزامنة</Label>
                                    <Switch
                                        id="enableSync"
                                        checked={newLicense.enableSync}
                                        onCheckedChange={(checked) => setNewLicense({ ...newLicense, enableSync: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="enableOfflineMode">وضع عدم الاتصال</Label>
                                    <Switch
                                        id="enableOfflineMode"
                                        checked={newLicense.enableOfflineMode}
                                        onCheckedChange={(checked) => setNewLicense({ ...newLicense, enableOfflineMode: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="autoUpdate">التحديث التلقائي</Label>
                                    <Switch
                                        id="autoUpdate"
                                        checked={newLicense.autoUpdate}
                                        onCheckedChange={(checked) => setNewLicense({ ...newLicense, autoUpdate: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            إلغاء
                        </Button>
                        <Button onClick={createLicense} disabled={isCreating || !newLicense.clientId}>
                            {isCreating ? (
                                <>
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    جاري الإنشاء...
                                </>
                            ) : (
                                'إنشاء الترخيص'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
