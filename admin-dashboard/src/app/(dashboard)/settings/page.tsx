'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Settings,
    User,
    Shield,
    Bell,
    Globe,
    Save,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const [profile, setProfile] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // TODO: API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Settings className="h-8 w-8" />
                    الإعدادات
                </h1>
                <p className="text-muted-foreground mt-1">
                    إدارة إعدادات حسابك والنظام
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile" className="gap-2">
                        <User className="h-4 w-4" />
                        الملف الشخصي
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Shield className="h-4 w-4" />
                        الأمان
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" />
                        الإشعارات
                    </TabsTrigger>
                    <TabsTrigger value="general" className="gap-2">
                        <Globe className="h-4 w-4" />
                        عام
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>معلومات الحساب</CardTitle>
                            <CardDescription>
                                تحديث معلومات حسابك الشخصية
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">الاسم الكامل</Label>
                                        <Input
                                            id="fullName"
                                            value={profile.fullName}
                                            onChange={(e) =>
                                                setProfile({ ...profile, fullName: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">البريد الإلكتروني</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) =>
                                                setProfile({ ...profile, email: e.target.value })
                                            }
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>اسم المستخدم</Label>
                                    <Input value={user?.username || ''} disabled />
                                    <p className="text-sm text-muted-foreground">
                                        لا يمكن تغيير اسم المستخدم
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                                جاري الحفظ...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="ml-2 h-4 w-4" />
                                                حفظ التغييرات
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>تغيير كلمة المرور</CardTitle>
                            <CardDescription>
                                تأكد من استخدام كلمة مرور قوية
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        value={profile.currentPassword}
                                        onChange={(e) =>
                                            setProfile({ ...profile, currentPassword: e.target.value })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={profile.newPassword}
                                            onChange={(e) =>
                                                setProfile({ ...profile, newPassword: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={profile.confirmPassword}
                                            onChange={(e) =>
                                                setProfile({ ...profile, confirmPassword: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit">
                                        <Save className="ml-2 h-4 w-4" />
                                        تغيير كلمة المرور
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>إعدادات الإشعارات</CardTitle>
                            <CardDescription>
                                تحكم في الإشعارات التي تتلقاها
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">اشتراكات على وشك الانتهاء</p>
                                        <p className="text-sm text-muted-foreground">
                                            إشعار قبل 7 أيام من انتهاء الاشتراك
                                        </p>
                                    </div>
                                    <Input type="checkbox" className="w-4 h-4" defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">تسجيل تاجر جديد</p>
                                        <p className="text-sm text-muted-foreground">
                                            إشعار عند تسجيل تاجر جديد
                                        </p>
                                    </div>
                                    <Input type="checkbox" className="w-4 h-4" defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">تفعيل ترخيص</p>
                                        <p className="text-sm text-muted-foreground">
                                            إشعار عند تفعيل ترخيص جديد
                                        </p>
                                    </div>
                                    <Input type="checkbox" className="w-4 h-4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>الإعدادات العامة</CardTitle>
                            <CardDescription>
                                إعدادات النظام العامة
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اسم النظام</Label>
                                    <Input defaultValue="H-POS Admin" />
                                </div>
                                <div className="space-y-2">
                                    <Label>البريد الإلكتروني للدعم</Label>
                                    <Input defaultValue="support@zimflo.com" dir="ltr" />
                                </div>
                                <div className="space-y-2">
                                    <Label>المنطقة الزمنية</Label>
                                    <Input defaultValue="Africa/Cairo" dir="ltr" disabled />
                                </div>
                                <div className="flex justify-end">
                                    <Button>
                                        <Save className="ml-2 h-4 w-4" />
                                        حفظ الإعدادات
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
