'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'Overview', icon: '📊' },
    { href: '/sessions', label: 'Sessions', icon: '🔗' },
    { href: '/tools', label: 'Tool Efficiency', icon: '🔧' },
    { href: '/retention', label: 'Retention', icon: '📈' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">🔍</div>
                <span className="sidebar-brand-text">AgentLens</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-env">
                Environment: <span>Development</span>
            </div>
        </aside>
    );
}
