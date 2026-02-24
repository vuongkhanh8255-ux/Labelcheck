'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Plus,
    Tag,
    Building2,
    BarChart3,
    Settings,
    ShieldCheck,
} from 'lucide-react';

const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/check', icon: Plus, label: 'Check Mới' },
    { href: '/brands', icon: Building2, label: 'Brands' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            width: '220px',
            minWidth: '220px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
        }}>
            {/* Logo */}
            <div style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <ShieldCheck size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            LabelCheck
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            v1.0 — QA System
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', padding: '8px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Chức năng
                </div>
                {navItems.map(({ href, icon: Icon, label }) => {
                    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                marginBottom: '2px',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--accent-blue-glow)' : 'transparent',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    );
                })}

                <div style={{ height: '1px', background: 'var(--border)', margin: '12px 0' }} />

                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 10px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Thống kê
                </div>
                <Link
                    href="/"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <BarChart3 size={16} />
                    Báo cáo
                </Link>
            </nav>

            {/* Footer */}
            <div style={{
                padding: '12px 10px',
                borderTop: '1px solid var(--border)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'white',
                    }}>
                        QA
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>QA Team</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
