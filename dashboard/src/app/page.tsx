'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Overview, RLInsight, SessionItem } from '@/lib/api';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyState from '@/components/EmptyState';

// Demo data — replaced by live API calls when backend is connected
const mockOverview: Overview = {
    totalSessions: 1_247,
    successRate: 73.2,
    avgCostPerSession: 0.042,
    avgCostPerSuccess: 0.058,
    totalTokens: 2_847_391,
    totalCostUsd: 52.38,
    loopDetectionRate: 8.7,
    avgToolsPerSession: 4.3,
};

const mockSessions: SessionItem[] = [
    { id: '1', traceId: 'trace-a8f2', model: 'claude-3.5-sonnet', status: 'success', totalInputTokens: 3200, totalOutputTokens: 1800, totalCostUsd: 0.038, toolCallsCount: 5, loopDetected: false, startedAt: '2026-03-07T18:30:00Z', endedAt: '2026-03-07T18:31:20Z' },
    { id: '2', traceId: 'trace-b3c7', model: 'gpt-4o', status: 'failure', totalInputTokens: 8400, totalOutputTokens: 4200, totalCostUsd: 0.126, toolCallsCount: 12, loopDetected: true, startedAt: '2026-03-07T17:45:00Z', endedAt: '2026-03-07T17:48:30Z' },
    { id: '3', traceId: 'trace-c1d9', model: 'claude-3.5-sonnet', status: 'success', totalInputTokens: 1500, totalOutputTokens: 900, totalCostUsd: 0.018, toolCallsCount: 3, loopDetected: false, startedAt: '2026-03-07T16:20:00Z', endedAt: '2026-03-07T16:20:45Z' },
    { id: '4', traceId: 'trace-d4e2', model: 'gpt-4o-mini', status: 'success', totalInputTokens: 2100, totalOutputTokens: 1200, totalCostUsd: 0.005, toolCallsCount: 4, loopDetected: false, startedAt: '2026-03-07T15:10:00Z', endedAt: '2026-03-07T15:11:00Z' },
    { id: '5', traceId: 'trace-e5f3', model: 'claude-3.5-sonnet', status: 'loop_detected', totalInputTokens: 15000, totalOutputTokens: 8000, totalCostUsd: 0.174, toolCallsCount: 18, loopDetected: true, startedAt: '2026-03-07T14:00:00Z', endedAt: '2026-03-07T14:05:00Z' },
];

const mockRLInsights: RLInsight[] = [
    { toolName: 'read_file', qValue: 0.87, actionCount: 342, avgReward: 0.82, recommendation: 'High value — agents using this tool first have 23% higher success rates' },
    { toolName: 'search_codebase', qValue: 0.74, actionCount: 256, avgReward: 0.71, recommendation: 'Effective when paired with read_file. Avoid using more than 3x per session' },
    { toolName: 'run_terminal', qValue: 0.61, actionCount: 189, avgReward: 0.58, recommendation: 'Moderate value — consider adding timeout guards to reduce loop risk' },
    { toolName: 'write_file', qValue: 0.52, actionCount: 298, avgReward: 0.49, recommendation: 'Often triggers retry loops when used without prior read_file. Suggest enforcing read-before-write' },
    { toolName: 'browser_action', qValue: 0.31, actionCount: 74, avgReward: 0.28, recommendation: 'Low efficiency — 47% of calls result in errors. Consider deprecating or adding better error handling' },
];

function getStatusBadge(status: string, loopDetected: boolean) {
    if (loopDetected) return <span className="badge badge-loop">Loop</span>;
    switch (status) {
        case 'success': return <span className="badge badge-success">Success</span>;
        case 'failure': return <span className="badge badge-error">Failed</span>;
        case 'active': return <span className="badge badge-active">Active</span>;
        case 'timeout': return <span className="badge badge-warning">Timeout</span>;
        default: return <span className="badge badge-active">{status}</span>;
    }
}

function getQValueClass(q: number): string {
    if (q >= 0.7) return 'high';
    if (q >= 0.4) return 'medium';
    return 'low';
}

function formatCost(usd: number): string {
    return `$${usd.toFixed(3)}`;
}

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export default function OverviewPage() {
    const [overview, setOverview] = useState<Overview | null>(null);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [rlInsights, setRlInsights] = useState<RLInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setOverview(mockOverview);
            setSessions(mockSessions);
            setRlInsights(mockRLInsights);
            setIsLoading(false);
        }, 850);
        return () => clearTimeout(t);
    }, []);

    if (isLoading || !overview) {
        return (
            <div style={{ paddingTop: '40px' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                    <div className="skeleton" style={{ flex: 1, height: '120px', borderRadius: '12px' }} />
                    <div className="skeleton" style={{ flex: 1, height: '120px', borderRadius: '12px' }} />
                    <div className="skeleton" style={{ flex: 1, height: '120px', borderRadius: '12px' }} />
                    <div className="skeleton" style={{ flex: 1, height: '120px', borderRadius: '12px' }} />
                </div>
                <TableSkeleton columns={7} rows={4} />
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Overview</h1>
                <p className="page-subtitle">Last 30 days</p>
            </div>

            {/* ── KPI Cards ── */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Sessions</div>
                    <div className="kpi-value">{overview.totalSessions.toLocaleString()}</div>
                    <div className="kpi-change positive">↑ 12% vs last week</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Success Rate</div>
                    <div className="kpi-value">{overview.successRate.toFixed(1)}%</div>
                    <div className="kpi-change positive">↑ 3.2% improvement</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Cost per Success</div>
                    <div className="kpi-value">{formatCost(overview.avgCostPerSuccess)}</div>
                    <div className="kpi-change negative">↑ $0.004 increase</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Loop Detection Rate</div>
                    <div className="kpi-value">{overview.loopDetectionRate.toFixed(1)}%</div>
                    <div className="kpi-change positive">↓ 2.1% fewer loops</div>
                </div>
            </div>

            {/* ── Token & Cost Summary ── */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card">
                    <div className="kpi-label">Total Tokens</div>
                    <div className="kpi-value">{formatTokens(overview.totalTokens)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Total Cost</div>
                    <div className="kpi-value">{formatCost(overview.totalCostUsd)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Avg Tools / Session</div>
                    <div className="kpi-value">{overview.avgToolsPerSession.toFixed(1)}</div>
                </div>
            </div>

            {/* ── RL Insights ── */}
            <div className="glass-card">
                <div className="glass-card-header">
                    <h2 className="glass-card-title">Tool Optimization</h2>
                    <span className="glass-card-badge">Q-Learning</span>
                </div>
                {rlInsights.map((insight) => (
                    <div key={insight.toolName} className="rl-insight">
                        <div className={`rl-q-value ${getQValueClass(insight.qValue)}`}>
                            {insight.qValue.toFixed(2)}
                        </div>
                        <div className="rl-detail">
                            <div className="rl-tool-name">{insight.toolName}</div>
                            <div className="rl-recommendation">{insight.recommendation}</div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '80px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {insight.actionCount} calls
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                Avg reward: {insight.avgReward.toFixed(2)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Recent Sessions ── */}
            {sessions.length === 0 ? (
                <EmptyState
                    icon="🌊"
                    title="No data flowing in"
                    description="Your dashboard is ready, but we haven't received any agent telemetry yet. Make sure you have initialized the SDK in your agent's codebase."
                    actionLabel="View Integration Guide"
                />
            ) : (
                <div className="glass-card">
                    <div className="glass-card-header">
                        <h2 className="glass-card-title">Recent Sessions</h2>
                        <span className="glass-card-badge">Latest</span>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Trace</th>
                                    <th>Model</th>
                                    <th>Status</th>
                                    <th>Tokens</th>
                                    <th>Cost</th>
                                    <th>Tools</th>
                                    <th>When</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500 }}>{s.traceId}</td>
                                        <td>{s.model}</td>
                                        <td>{getStatusBadge(s.status, s.loopDetected)}</td>
                                        <td>{formatTokens(s.totalInputTokens + s.totalOutputTokens)}</td>
                                        <td>{formatCost(s.totalCostUsd)}</td>
                                        <td>{s.toolCallsCount}</td>
                                        <td style={{ color: 'var(--text-tertiary)' }}>{formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}
