import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon = '🔌',
    title,
    description,
    actionLabel,
    onAction
}: EmptyStateProps) {
    return (
        <div className="glass-card" style={{ padding: '64px 32px', textAlign: 'center', marginTop: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.8 }}>{icon}</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {title}
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                {description}
            </p>
            {actionLabel && (
                <button
                    onClick={onAction}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
