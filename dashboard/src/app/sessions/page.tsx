'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { api, type SessionItem } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';

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
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Intervention Modal State
    const [interventionTrace, setInterventionTrace] = useState<SessionItem | null>(null);
    const [hintText, setHintText] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filter !== 'all') {
                if (filter === 'loops') {
                    params.loopDetected = 'true';
                } else {
                    params.status = filter;
                }
            }

            const res = await api.getSessions({
                page,
                pageSize: 20,
                params
            });
            setSessions(res.data);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [page, filter]);

    useEffect(() => {
        setPage(1);
    }, [filter]);

    const filtered = sessions;

    const handleResolve = async () => {
        if (!interventionTrace || !hintText.trim()) return;
        setIsResolving(true);
        setResolveError(null);
        try {
            await api.resolveIntervention(interventionTrace.id, hintText);

            // Update UI speculatively
            setSessions(prev => prev.map(s => s.id === interventionTrace.id ? { ...s, loopDetected: false, status: 'active' } : s));
            setInterventionTrace(null);
            setHintText('');
        } catch (err) {
            console.error('Failed to resolve intervention:', err);
            setResolveError((err as Error).message || 'Failed to steer agent.');
        } finally {
            setIsResolving(false);
        }
    };

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
            {isLoading ? (
                <TableSkeleton columns={8} rows={5} />
            ) : sessions.length === 0 ? (
                <EmptyState
                    icon="🤖"
                    title="No sessions recorded yet"
                    description="When your AI agents run, their invocation traces will appear here. Ensure the AgentLens SDK is installed and configured correctly in your project."
                    actionLabel="View SDK Docs"
                    onAction={() => window.open('https://github.com/itzvenkat/agentlens/tree/main/docs/wiki', '_blank')}
                />
            ) : (
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
                                    <th>Duration / When</th>
                                    <th>Intervention</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500 }}>{s.traceId}</td>
                                        <td>{s.model || 'Unknown'}</td>
                                        <td>{getStatusBadge(s.status, s.loopDetected)}</td>
                                        <td>{s.totalInputTokens >= 1000 ? `${(s.totalInputTokens / 1000).toFixed(1)}k` : s.totalInputTokens}</td>
                                        <td>{s.totalOutputTokens >= 1000 ? `${(s.totalOutputTokens / 1000).toFixed(1)}k` : s.totalOutputTokens}</td>
                                        <td>${Number(s.totalCostUsd || 0).toFixed(3)}</td>
                                        <td>{s.toolCallsCount}</td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatDuration(s.startedAt, s.endedAt)}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                {formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}
                                            </div>
                                        </td>
                                        <td>
                                            {s.loopDetected && (
                                                <button
                                                    onClick={() => setInterventionTrace(s)}
                                                    style={{
                                                        background: 'var(--gradient-warning)',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '6px 14px',
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <span>🚨</span> Halt & Steer
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--bg-glass-border)' }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{
                                    padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--bg-glass-border)',
                                    color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500
                                }}
                            >
                                Previous
                            </button>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={{
                                    padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--bg-glass-border)',
                                    color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: '6px', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500
                                }}
                            >
                                Next
                            </button>
                        </div>
                    )}

                    {filtered.length === 0 && sessions.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '24px', opacity: 0.5, marginBottom: '8px' }}>🔍</div>
                            <div>No sessions found for this active filter.</div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Intervention Modal ── */}
            {interventionTrace && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
                        <div style={{
                            position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px',
                            background: 'var(--status-warning)', borderRadius: '50%', boxShadow: '0 0 20px var(--status-warning)',
                            animation: 'pulse 2s infinite'
                        }} />

                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🛑</span> Intercept Agent Loop
                        </h2>

                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            Agent <code style={{ color: 'var(--accent-secondary)' }}>{interventionTrace.traceId}</code> is currently physically paused due to a detected tool loop. By providing a hint, the Proxy will inject your text into the agent's prompt and release the loop lock.
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                                Developer Hint (System Override)
                            </label>
                            <textarea
                                value={hintText}
                                onChange={(e) => setHintText(e.target.value)}
                                placeholder="e.g. You are stuck because the file is read-only. Try using the search tool instead."
                                style={{
                                    width: '100%', height: '100px', background: 'var(--bg-tertiary)', border: '1px solid var(--bg-glass-border)',
                                    borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '14px',
                                    resize: 'none', fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {resolveError && (
                            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: 'var(--status-error)', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>⚠️</span>
                                <div>
                                    <strong style={{ display: 'block', marginBottom: '4px' }}>Intervention Failed</strong>
                                    {resolveError}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => { setInterventionTrace(null); setHintText(''); }}
                                style={{
                                    padding: '8px 16px', background: 'transparent', border: '1px solid var(--bg-glass-border)',
                                    color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResolve}
                                disabled={isResolving || !hintText.trim()}
                                style={{
                                    padding: '8px 20px', background: 'var(--gradient-success)', border: 'none',
                                    color: '#fff', borderRadius: '6px', cursor: isResolving || !hintText.trim() ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: 600, opacity: isResolving || !hintText.trim() ? 0.6 : 1,
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                {isResolving ? 'Steering...' : 'Release Agent & Inject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
