'use client';

import { useAuth } from '@/lib/auth';
import { Bell, Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';

export function Header() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="بحث..."
                    className="pr-9 bg-muted/50"
                />
            </div>

            <div className="flex items-center gap-2 mr-auto">
                {/* Theme toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <Badge
                                className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center"
                                variant="destructive"
                            >
                                3
                            </Badge>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="flex flex-col items-start gap-1">
                            <p className="font-medium">ترخيص جديد مفعل</p>
                            <p className="text-sm text-muted-foreground">
                                تم تفعيل ترخيص جديد لـ "محلات الأمل"
                            </p>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex flex-col items-start gap-1">
                            <p className="font-medium">اشتراك على وشك الانتهاء</p>
                            <p className="text-sm text-muted-foreground">
                                3 اشتراكات ستنتهي خلال 7 أيام
                            </p>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    {user?.fullName?.charAt(0) || 'A'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden md:inline">{user?.fullName}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>الملف الشخصي</DropdownMenuItem>
                        <DropdownMenuItem>الإعدادات</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="text-destructive">
                            تسجيل الخروج
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
