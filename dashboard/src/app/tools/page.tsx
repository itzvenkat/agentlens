'use client';

import { useState } from 'react';
import type { ToolEfficiency } from '@/lib/api';

const mockTools: ToolEfficiency[] = [
    { toolName: 'read_file', totalCalls: 342, successRate: 94.7, avgDurationMs: 45, retryRate: 2.3, errorRate: 5.3 },
    { toolName: 'search_codebase', totalCalls: 256, successRate: 88.3, avgDurationMs: 320, retryRate: 5.1, errorRate: 6.6 },
    { toolName: 'write_file', totalCalls: 298, successRate: 82.1, avgDurationMs: 78, retryRate: 12.4, errorRate: 5.5 },
    { toolName: 'run_terminal', totalCalls: 189, successRate: 76.2, avgDurationMs: 1250, retryRate: 8.9, errorRate: 14.9 },
    { toolName: 'browser_action', totalCalls: 74, successRate: 53.2, avgDurationMs: 2400, retryRate: 23.1, errorRate: 23.7 },
    { toolName: 'list_dir', totalCalls: 167, successRate: 97.6, avgDurationMs: 12, retryRate: 0.6, errorRate: 2.4 },
    { toolName: 'view_file_outline', totalCalls: 134, successRate: 95.5, avgDurationMs: 28, retryRate: 1.1, errorRate: 3.4 },
    { toolName: 'grep_search', totalCalls: 221, successRate: 91.0, avgDurationMs: 180, retryRate: 3.8, errorRate: 5.2 },
];

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
    const [tools] = useState<ToolEfficiency[]>(mockTools);
    const sorted = [...tools].sort((a, b) => b.successRate - a.successRate);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Tool Efficiency</h1>
                <p className="page-subtitle">Success rates and performance by tool</p>
            </div>

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
            <div className="glass-card">
                <div className="glass-card-header">
                    <h2 className="glass-card-title">All Tools</h2>
                </div>
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
                                <td>{tool.toolName}</td>
                                <td>{tool.totalCalls}</td>
                                <td style={{ color: getEfficiencyColor(tool.successRate), fontWeight: 600 }}>
                                    {tool.successRate.toFixed(1)}%
                                </td>
                                <td>{tool.avgDurationMs}ms</td>
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
        </>
    );
}
