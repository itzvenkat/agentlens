'use client';

import { useState } from 'react';
import type { RetentionPoint } from '@/lib/api';

const mockRetention: RetentionPoint[] = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(2026, 2, 7 - 13 + i);
    const base = 35 + Math.floor(Math.random() * 20);
    const sessions = base + Math.floor(Math.random() * 40);
    const returning = Math.floor(base * (0.5 + Math.random() * 0.3));
    return {
        date: date.toISOString().split('T')[0],
        uniqueAgents: base,
        totalSessions: sessions,
        returningAgents: returning,
        retentionRate: (returning / base) * 100,
    };
});

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RetentionPage() {
    const [retention] = useState<RetentionPoint[]>(mockRetention);
    const maxSessions = Math.max(...retention.map((r) => r.totalSessions));
    const avgRetention = retention.reduce((sum, r) => sum + r.retentionRate, 0) / retention.length;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Retention</h1>
                <p className="page-subtitle">Agent activity and return rates</p>
            </div>

            {/* ── Retention KPIs ── */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card">
                    <div className="kpi-label">Avg Retention Rate</div>
                    <div className="kpi-value">{avgRetention.toFixed(1)}%</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Peak Active Agents</div>
                    <div className="kpi-value">{Math.max(...retention.map((r) => r.uniqueAgents))}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Total Sessions (14d)</div>
                    <div className="kpi-value">{retention.reduce((s, r) => s + r.totalSessions, 0)}</div>
                </div>
            </div>

            {/* ── Bar Chart (CSS-only) ── */}
            <div className="glass-card">
                <div className="glass-card-header">
                    <h2 className="glass-card-title">Daily Activity (14 days)</h2>
                    <span className="glass-card-badge">14 days</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '220px', padding: '0 8px' }}>
                    {retention.map((r, i) => (
                        <div key={r.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                {r.totalSessions}
                            </div>
                            <div
                                style={{
                                    width: '100%',
                                    maxWidth: '40px',
                                    height: `${(r.totalSessions / maxSessions) * 180}px`,
                                    borderRadius: '6px 6px 2px 2px',
                                    background: `linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                                    opacity: 0.6 + (r.retentionRate / 100) * 0.4,
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: `${r.retentionRate}%`,
                                        background: 'rgba(255,255,255,0.15)',
                                        borderRadius: '0 0 2px 2px',
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                                {formatDate(r.date)}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--gradient-primary)' }} />
                        Total Sessions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.15)' }} />
                        Returning Agents
                    </div>
                </div>
            </div>

            {/* ── Detailed Table ── */}
            <div className="glass-card">
                <div className="glass-card-header">
                    <h2 className="glass-card-title">Daily Breakdown</h2>
                </div>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Unique Agents</th>
                                <th>Total Sessions</th>
                                <th>Returning</th>
                                <th>Retention Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...retention].reverse().map((r) => (
                                <tr key={r.date}>
                                    <td>{formatDate(r.date)}</td>
                                    <td>{r.uniqueAgents}</td>
                                    <td>{r.totalSessions}</td>
                                    <td>{r.returningAgents}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="progress-bar" style={{ width: '80px' }}>
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{
                                                        width: `${r.retentionRate}%`,
                                                        background: r.retentionRate >= 70 ? 'var(--gradient-success)' : 'var(--gradient-warning)',
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: r.retentionRate >= 70 ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                                {r.retentionRate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
