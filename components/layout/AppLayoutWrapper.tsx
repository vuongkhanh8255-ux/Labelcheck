'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLanding = pathname === '/';

    if (isLanding) {
        return <main>{children}</main>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                overflow: 'auto',
                background: 'var(--bg-primary)',
            }}>
                {children}
            </main>
        </div>
    );
}
