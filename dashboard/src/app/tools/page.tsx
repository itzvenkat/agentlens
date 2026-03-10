'use client';

import { useState, useEffect } from 'react';
import { api, type ToolEfficiency } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';

function getEfficiencyColor(rate: number): string {
    if (rate >= 90) return 'var(--status-success)';
    if (rate >= 70) return 'var(--status-warning)';
    return 'var(--status-error)';
}

function getHeatmapBg(rate: number): string {
    if (rate >= 90) return 'rgba(16, 185, 129, 0.15)';
    if (rate >= 70) return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(244, 63, 94, 0.15)';
}

export default function ToolsPage() {
    const [tools, setTools] = useState<ToolEfficiency[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const res = await api.getToolEfficiency();
                setTools(res);
            } catch (err) {
                console.error('Failed to fetch tool efficiency:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTools();
    }, []);

    const sorted = [...tools].sort((a, b) => b.successRate - a.successRate);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Tool Efficiency</h1>
                <p className="page-subtitle">Success rates and performance by tool</p>
            </div>

            {isLoading ? (
                <TableSkeleton columns={7} rows={6} />
            ) : tools.length === 0 ? (
                <EmptyState
                    icon="🛠️"
                    title="No tools logged yet"
                    description="When your AI agents use tools (like function calling), AgentLens analyzes their success rates and latency here."
                />
            ) : (
                <>
                    {/* ── Efficiency Heatmap ── */}
                    <div className="glass-card">
                        <div className="glass-card-header">
                            <h2 className="glass-card-title">Efficiency Heatmap</h2>
                            <span className="glass-card-badge">Last 30 days</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {sorted.map((tool) => (
                                <div
                                    key={tool.toolName}
                                    style={{
                                        padding: '16px',
                                        borderRadius: 'var(--radius-md)',
                                        background: getHeatmapBg(tool.successRate),
                                        border: `1px solid ${getEfficiencyColor(tool.successRate)}22`,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                                        {tool.toolName}
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: getEfficiencyColor(tool.successRate), marginBottom: '4px' }}>
                                        {tool.successRate.toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                        {tool.totalCalls} calls · {tool.avgDurationMs}ms avg
                                    </div>
                                    <div className="progress-bar" style={{ marginTop: '8px' }}>
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${tool.successRate}%`,
                                                background: `linear-gradient(90deg, ${getEfficiencyColor(tool.successRate)}, ${getEfficiencyColor(tool.successRate)}88)`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Detailed Table ── */}
                    <div className="glass-card" style={{ marginTop: '24px' }}>
                        <div className="glass-card-header">
                            <h2 className="glass-card-title">All Tools</h2>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tool</th>
                                        <th>Total Calls</th>
                                        <th>Success Rate</th>
                                        <th>Avg Duration</th>
                                        <th>Retry Rate</th>
                                        <th>Error Rate</th>
                                        <th>Health</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((tool) => (
                                        <tr key={tool.toolName}>
                                            <td style={{ fontWeight: 500 }}>{tool.toolName}</td>
                                            <td>{tool.totalCalls}</td>
                                            <td style={{ color: getEfficiencyColor(tool.successRate), fontWeight: 600 }}>
                                                {tool.successRate.toFixed(1)}%
                                            </td>
                                            <td>{tool.avgDurationMs >= 1000 ? `${(tool.avgDurationMs / 1000).toFixed(1)}s` : `${tool.avgDurationMs}ms`}</td>
                                            <td style={{ color: tool.retryRate > 10 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                                                {tool.retryRate.toFixed(1)}%
                                            </td>
                                            <td style={{ color: tool.errorRate > 15 ? 'var(--status-error)' : 'var(--text-secondary)' }}>
                                                {tool.errorRate.toFixed(1)}%
                                            </td>
                                            <td>
                                                {tool.successRate >= 90 ? '🟢' : tool.successRate >= 70 ? '🟡' : '🔴'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
