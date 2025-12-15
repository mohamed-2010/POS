'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    Building2,
    Key,
    CreditCard,
    BarChart3,
    Settings,
    Monitor,
    ChevronLeft,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

const navigation = [
    { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
    { name: 'التجار', href: '/clients', icon: Users },
    { name: 'الفروع', href: '/branches', icon: Building2 },
    { name: 'التراخيص', href: '/licenses', icon: Key },
    { name: 'الاشتراكات', href: '/subscriptions', icon: CreditCard },
    { name: 'التقارير', href: '/reports', icon: BarChart3 },
    { name: 'مراقبة النظام', href: '/system', icon: Monitor },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div
            className={cn(
                'flex flex-col h-full bg-card border-l transition-all duration-300',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                {!collapsed && (
                    <h1 className="text-xl font-bold text-primary">POS Admin</h1>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(collapsed && 'mx-auto')}
                >
                    <ChevronLeft
                        className={cn(
                            'h-4 w-4 transition-transform',
                            collapsed && 'rotate-180'
                        )}
                    />
                </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4" dir='rtl'>
                <nav className="space-y-1 px-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-accent',
                                    isActive && 'bg-primary/10 text-primary font-medium',
                                    collapsed && 'justify-center'
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* User section */}
            <Separator />
            <div className="p-4">
                <div
                    className={cn(
                        'flex items-center gap-3',
                        collapsed && 'flex-col'
                    )}
                >
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>
                            {user?.fullName?.charAt(0) || 'A'}
                        </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.role === 'super_admin' ? 'مدير عام' : user?.role}
                            </p>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        className="shrink-0"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
