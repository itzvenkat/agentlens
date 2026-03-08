'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'Overview', icon: '📊' },
    { href: '/sessions', label: 'Sessions', icon: '🔗' },
    { href: '/tools', label: 'Tool Efficiency', icon: '🔧' },
    { href: '/retention', label: 'Retention', icon: '📈' },
];

export default function Sidebar({
    isOpen,
    onClose,
}: {
    isOpen?: boolean;
    onClose?: () => void;
}) {
    const pathname = usePathname();

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">🔍</div>
                <span className="sidebar-brand-text">AgentLens</span>

                {/* Mobile Close Button */}
                <button
                    className="sidebar-close-btn"
                    onClick={onClose}
                    aria-label="Close Sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
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
