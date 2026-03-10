'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { api, type Overview, type RLInsight, type SessionItem } from '@/lib/api';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyState from '@/components/EmptyState';

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
        const loadDashboard = async () => {
            setIsLoading(true);
            try {
                const opts = { apiKey: 'agentlens_master_dev_key' };
                const [overviewRes, sessionsRes, insightsRes] = await Promise.all([
                    api.getOverview(opts),
                    api.getSessions({ ...opts, page: 1, pageSize: 6 }), // Only latest 6 for overview
                    api.getRLInsights(opts)
                ]);

                setOverview(overviewRes);
                setSessions(sessionsRes.data);
                setRlInsights(insightsRes);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboard();
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
                    {typeof overview.totalSessionsChange === 'number' && overview.totalSessionsChange !== 0 ? (
                        <div className={`kpi-change ${overview.totalSessionsChange > 0 ? 'positive' : 'negative'}`}>
                            {overview.totalSessionsChange > 0 ? '↑' : '↓'} {Math.abs(overview.totalSessionsChange).toFixed(1)}% vs previous
                        </div>
                    ) : null}
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Success Rate</div>
                    <div className="kpi-value">{overview.successRate.toFixed(1)}%</div>
                    {typeof overview.successRateChange === 'number' && overview.successRateChange !== 0 ? (
                        <div className={`kpi-change ${overview.successRateChange > 0 ? 'positive' : 'negative'}`}>
                            {overview.successRateChange > 0 ? '↑' : '↓'} {Math.abs(overview.successRateChange).toFixed(1)}% vs previous
                        </div>
                    ) : null}
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Cost per Success</div>
                    <div className="kpi-value">{formatCost(overview.avgCostPerSuccess)}</div>
                    {typeof overview.costPerSuccessChange === 'number' && overview.costPerSuccessChange !== 0 ? (
                        <div className={`kpi-change ${overview.costPerSuccessChange <= 0 ? 'positive' : 'negative'}`}>
                            {overview.costPerSuccessChange <= 0 ? '↓' : '↑'} ${Math.abs(overview.costPerSuccessChange).toFixed(3)} vs previous
                        </div>
                    ) : null}
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Loop Detection Rate</div>
                    <div className="kpi-value">{overview.loopDetectionRate.toFixed(1)}%</div>
                    {typeof overview.loopDetectionRateChange === 'number' && overview.loopDetectionRateChange !== 0 ? (
                        <div className={`kpi-change ${overview.loopDetectionRateChange <= 0 ? 'positive' : 'negative'}`}>
                            {overview.loopDetectionRateChange <= 0 ? '↓' : '↑'} {Math.abs(overview.loopDetectionRateChange).toFixed(1)}% vs previous
                        </div>
                    ) : null}
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
                    onAction={() => window.open('https://github.com/itzvenkat/agentlens/tree/main/docs/wiki', '_blank')}
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
