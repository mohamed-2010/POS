'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Download,
    Plus,
    Trash2,
    Loader2,
    Package,
    Apple,
    Monitor,
} from 'lucide-react';
import api from '@/lib/api';

interface AppVersion {
    id: string;
    version: string;
    platform: 'win32' | 'darwin' | 'linux';
    download_url: string;
    release_notes: string;
    file_size: number;
    checksum: string;
    is_mandatory: boolean;
    is_active: boolean;
    created_at: string;
}

export default function UpdatesPage() {
    const [versions, setVersions] = useState<AppVersion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [stats, setStats] = useState({ win32: 0, darwin: 0, linux: 0 });

    const [newVersion, setNewVersion] = useState({
        version: '',
        platform: 'win32' as 'win32' | 'darwin' | 'linux',
        downloadUrl: '',
        releaseNotes: '',
        fileSize: 0,
        checksum: '',
        isMandatory: false,
    });

    const fetchVersions = async () => {
        try {
            setIsLoading(true);
            // This endpoint may not exist yet, so handle gracefully
            const res = await api.get('/updates/versions').catch(() => ({ data: { data: [] } }));
            const data = res.data.data || res.data || [];
            setVersions(Array.isArray(data) ? data : []);

            // Calculate stats per platform
            const platformStats = { win32: 0, darwin: 0, linux: 0 };
            data.forEach((v: AppVersion) => {
                if (v.platform in platformStats) {
                    platformStats[v.platform as keyof typeof platformStats]++;
                }
            });
            setStats(platformStats);
        } catch (error) {
            console.error('Error fetching versions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVersions();
    }, []);

    const createVersion = async () => {
        try {
            setIsCreating(true);
            await api.post('/updates/versions', {
                version: newVersion.version,
                platform: newVersion.platform,
                download_url: newVersion.downloadUrl,
                release_notes: newVersion.releaseNotes,
                file_size: newVersion.fileSize,
                checksum: newVersion.checksum,
                is_mandatory: newVersion.isMandatory,
            });
            setShowAddDialog(false);
            setNewVersion({
                version: '',
                platform: 'win32',
                downloadUrl: '',
                releaseNotes: '',
                fileSize: 0,
                checksum: '',
                isMandatory: false,
            });
            fetchVersions();
        } catch (error) {
            console.error('Error creating version:', error);
            alert('حدث خطأ أثناء إضافة الإصدار');
        } finally {
            setIsCreating(false);
        }
    };

    const deleteVersion = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الإصدار؟')) return;
        try {
            await api.delete(`/updates/versions/${id}`);
            fetchVersions();
        } catch (error) {
            console.error('Error deleting version:', error);
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'darwin':
                return <Apple className="h-4 w-4" />;
            case 'win32':
                return <Monitor className="h-4 w-4" />;
            case 'linux':
                return <Package className="h-4 w-4" />;
            default:
                return <Package className="h-4 w-4" />;
        }
    };

    const getPlatformName = (platform: string) => {
        switch (platform) {
            case 'darwin':
                return 'macOS';
            case 'win32':
                return 'Windows';
            case 'linux':
                return 'Linux';
            default:
                return platform;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '-';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Download className="h-8 w-8" />
                        إدارة التحديثات
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة إصدارات التطبيق للتحديث التلقائي
                    </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة إصدار
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-blue-500" />
                            <span className="text-2xl font-bold">{stats.win32}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">إصدارات Windows</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Apple className="h-5 w-5 text-gray-500" />
                            <span className="text-2xl font-bold">{stats.darwin}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">إصدارات macOS</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-orange-500" />
                            <span className="text-2xl font-bold">{stats.linux}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">إصدارات Linux</p>
                    </CardContent>
                </Card>
            </div>

            {/* Versions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>الإصدارات المتاحة</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            لا توجد إصدارات بعد. قم بإضافة أول إصدار.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الإصدار</TableHead>
                                    <TableHead>النظام</TableHead>
                                    <TableHead>الحجم</TableHead>
                                    <TableHead>ملاحظات</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versions.map((version) => (
                                    <TableRow key={version.id}>
                                        <TableCell>
                                            <code className="bg-muted px-2 py-1 rounded font-mono">
                                                v{version.version}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getPlatformIcon(version.platform)}
                                                {getPlatformName(version.platform)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatFileSize(version.file_size)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {version.release_notes || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Badge variant={version.is_active ? 'default' : 'secondary'}>
                                                    {version.is_active ? 'نشط' : 'غير نشط'}
                                                </Badge>
                                                {version.is_mandatory && (
                                                    <Badge variant="destructive">إجباري</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {version.created_at
                                                ? new Date(version.created_at).toLocaleDateString('ar-EG')
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => deleteVersion(version.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Version Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>إضافة إصدار جديد</DialogTitle>
                        <DialogDescription>
                            أدخل بيانات الإصدار الجديد للتحديث التلقائي
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="version">رقم الإصدار *</Label>
                                <Input
                                    id="version"
                                    value={newVersion.version}
                                    onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                                    placeholder="1.0.2"
                                    dir="ltr"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="platform">نظام التشغيل *</Label>
                                <Select
                                    value={newVersion.platform}
                                    onValueChange={(value: 'win32' | 'darwin' | 'linux') =>
                                        setNewVersion({ ...newVersion, platform: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="win32">Windows</SelectItem>
                                        <SelectItem value="darwin">macOS</SelectItem>
                                        <SelectItem value="linux">Linux</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="downloadUrl">رابط التحميل / اسم الملف *</Label>
                            <Input
                                id="downloadUrl"
                                value={newVersion.downloadUrl}
                                onChange={(e) => setNewVersion({ ...newVersion, downloadUrl: e.target.value })}
                                placeholder="app-1.0.2-win.exe"
                                dir="ltr"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="fileSize">حجم الملف (بايت)</Label>
                                <Input
                                    id="fileSize"
                                    type="number"
                                    value={newVersion.fileSize}
                                    onChange={(e) => setNewVersion({ ...newVersion, fileSize: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="checksum">SHA512 Checksum</Label>
                                <Input
                                    id="checksum"
                                    value={newVersion.checksum}
                                    onChange={(e) => setNewVersion({ ...newVersion, checksum: e.target.value })}
                                    placeholder="اختياري"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="releaseNotes">ملاحظات الإصدار</Label>
                            <Textarea
                                id="releaseNotes"
                                value={newVersion.releaseNotes}
                                onChange={(e) => setNewVersion({ ...newVersion, releaseNotes: e.target.value })}
                                placeholder="ما الجديد في هذا الإصدار..."
                                className="h-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            إلغاء
                        </Button>
                        <Button
                            onClick={createVersion}
                            disabled={isCreating || !newVersion.version || !newVersion.downloadUrl}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    جاري الإضافة...
                                </>
                            ) : (
                                'إضافة الإصدار'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
