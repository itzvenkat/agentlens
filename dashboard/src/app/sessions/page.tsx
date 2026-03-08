'use client';

import { useState } from 'react';
import type { SessionItem } from '@/lib/api';

const mockSessions: SessionItem[] = [
    { id: '1', traceId: 'trace-a8f2c1', model: 'claude-3.5-sonnet', status: 'success', totalInputTokens: 3200, totalOutputTokens: 1800, totalCostUsd: 0.038, toolCallsCount: 5, loopDetected: false, startedAt: '2026-03-07T18:30:00Z', endedAt: '2026-03-07T18:31:20Z' },
    { id: '2', traceId: 'trace-b3c7d2', model: 'gpt-4o', status: 'failure', totalInputTokens: 8400, totalOutputTokens: 4200, totalCostUsd: 0.126, toolCallsCount: 12, loopDetected: true, startedAt: '2026-03-07T17:45:00Z', endedAt: '2026-03-07T17:48:30Z' },
    { id: '3', traceId: 'trace-c1d9e3', model: 'claude-3.5-sonnet', status: 'success', totalInputTokens: 1500, totalOutputTokens: 900, totalCostUsd: 0.018, toolCallsCount: 3, loopDetected: false, startedAt: '2026-03-07T16:20:00Z', endedAt: '2026-03-07T16:20:45Z' },
    { id: '4', traceId: 'trace-d4e2f4', model: 'gpt-4o-mini', status: 'success', totalInputTokens: 2100, totalOutputTokens: 1200, totalCostUsd: 0.005, toolCallsCount: 4, loopDetected: false, startedAt: '2026-03-07T15:10:00Z', endedAt: '2026-03-07T15:11:00Z' },
    { id: '5', traceId: 'trace-e5f3g5', model: 'claude-3.5-sonnet', status: 'loop_detected', totalInputTokens: 15000, totalOutputTokens: 8000, totalCostUsd: 0.174, toolCallsCount: 18, loopDetected: true, startedAt: '2026-03-07T14:00:00Z', endedAt: '2026-03-07T14:05:00Z' },
    { id: '6', traceId: 'trace-f6g4h6', model: 'gpt-4o', status: 'success', totalInputTokens: 4500, totalOutputTokens: 2300, totalCostUsd: 0.068, toolCallsCount: 7, loopDetected: false, startedAt: '2026-03-07T13:30:00Z', endedAt: '2026-03-07T13:32:00Z' },
    { id: '7', traceId: 'trace-g7h5i7', model: 'claude-3.5-haiku', status: 'success', totalInputTokens: 800, totalOutputTokens: 400, totalCostUsd: 0.003, toolCallsCount: 2, loopDetected: false, startedAt: '2026-03-07T12:15:00Z', endedAt: '2026-03-07T12:15:30Z' },
    { id: '8', traceId: 'trace-h8i6j8', model: 'gpt-4o', status: 'failure', totalInputTokens: 6200, totalOutputTokens: 3100, totalCostUsd: 0.093, toolCallsCount: 9, loopDetected: false, startedAt: '2026-03-07T11:00:00Z', endedAt: '2026-03-07T11:03:00Z' },
];

function getStatusBadge(status: string, loopDetected: boolean) {
    if (loopDetected) return <span className="badge badge-loop">Loop</span>;
    switch (status) {
        case 'success': return <span className="badge badge-success">Success</span>;
        case 'failure': return <span className="badge badge-error">Failed</span>;
        case 'active': return <span className="badge badge-active">Active</span>;
        default: return <span className="badge badge-active">{status}</span>;
    }
}

function formatDuration(start: string, end: string | null): string {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

export default function SessionsPage() {
    const [sessions] = useState<SessionItem[]>(mockSessions);
    const [filter, setFilter] = useState<string>('all');

    const filtered = filter === 'all'
        ? sessions
        : sessions.filter((s) =>
            filter === 'loops' ? s.loopDetected : s.status === filter
        );

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Sessions</h1>
                <p className="page-subtitle">All agent invocations</p>
            </div>

            {/* ── Filter Bar ── */}
            <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['all', 'success', 'failure', 'loops'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                background: filter === f ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                color: filter === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                            }}
                        >
                            {f === 'all' ? 'All' : f === 'loops' ? '🔄 Loops' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Sessions Table ── */}
            <div className="glass-card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Trace ID</th>
                                <th>Model</th>
                                <th>Status</th>
                                <th>Input Tokens</th>
                                <th>Output Tokens</th>
                                <th>Cost</th>
                                <th>Tools</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{s.traceId}</td>
                                    <td>{s.model}</td>
                                    <td>{getStatusBadge(s.status, s.loopDetected)}</td>
                                    <td>{s.totalInputTokens.toLocaleString()}</td>
                                    <td>{s.totalOutputTokens.toLocaleString()}</td>
                                    <td>${s.totalCostUsd.toFixed(3)}</td>
                                    <td>{s.toolCallsCount}</td>
                                    <td style={{ color: 'var(--text-tertiary)' }}>
                                        {formatDuration(s.startedAt, s.endedAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-title">No sessions found</div>
                        <p>Try adjusting your filter</p>
                    </div>
                )}
            </div>
        </>
    );
}
