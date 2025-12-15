'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function NewClientPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        nameEn: '',
        email: '',
        phone: '',
        address: '',
        taxNumber: '',
        subscriptionPlan: 'basic',
        maxBranches: 1,
        maxDevices: 1,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.post('/clients', formData);
            router.push('/clients');
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ أثناء الإضافة');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/clients">
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Plus className="h-8 w-8" />
                        إضافة تاجر جديد
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        أدخل بيانات التاجر الجديد
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                {error && (
                    <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg">
                        {error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>معلومات التاجر</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">الاسم بالعربية *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="اسم التاجر"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nameEn">الاسم بالإنجليزية</Label>
                                <Input
                                    id="nameEn"
                                    value={formData.nameEn}
                                    onChange={(e) => handleChange('nameEn', e.target.value)}
                                    placeholder="Client name"
                                    dir="ltr"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="email">البريد الإلكتروني</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="email@example.com"
                                    dir="ltr"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">الهاتف</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="01xxxxxxxxx"
                                    dir="ltr"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">العنوان</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder="عنوان التاجر"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                            <Input
                                id="taxNumber"
                                value={formData.taxNumber}
                                onChange={(e) => handleChange('taxNumber', e.target.value)}
                                placeholder="الرقم الضريبي"
                                dir="ltr"
                                disabled={isLoading}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>الاشتراك</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="plan">خطة الاشتراك</Label>
                            <Select
                                value={formData.subscriptionPlan}
                                onValueChange={(value) => handleChange('subscriptionPlan', value)}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الخطة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basic">الأساسية - 99 ج.م/شهر</SelectItem>
                                    <SelectItem value="professional">الاحترافية - 199 ج.م/شهر</SelectItem>
                                    <SelectItem value="enterprise">المؤسسات - 499 ج.م/شهر</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="maxBranches">الحد الأقصى للفروع</Label>
                                <Input
                                    id="maxBranches"
                                    type="number"
                                    min={1}
                                    value={formData.maxBranches}
                                    onChange={(e) => handleChange('maxBranches', parseInt(e.target.value))}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxDevices">الحد الأقصى للأجهزة</Label>
                                <Input
                                    id="maxDevices"
                                    type="number"
                                    min={1}
                                    value={formData.maxDevices}
                                    onChange={(e) => handleChange('maxDevices', parseInt(e.target.value))}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4 mt-6">
                    <Button type="button" variant="outline" asChild disabled={isLoading}>
                        <Link href="/clients">إلغاء</Link>
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <Plus className="ml-2 h-4 w-4" />
                                إضافة التاجر
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
