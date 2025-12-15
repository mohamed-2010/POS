'use client';

import { AuthGuard, Sidebar, Header } from '@/components/layout';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-auto p-6 bg-muted/30">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
