import React from 'react';

export default function TableSkeleton({ columns = 5, rows = 4 }: { columns?: number, rows?: number }) {
    return (
        <div className="glass-card">
            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i}>
                                    <div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px' }} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, rowIndex) => (
                            <tr key={rowIndex}>
                                {Array.from({ length: columns }).map((_, colIndex) => (
                                    <td key={colIndex}>
                                        <div
                                            className="skeleton"
                                            style={{
                                                width: colIndex === 0 ? '80%' : '50%',
                                                height: '20px',
                                                borderRadius: '4px',
                                                opacity: 1 - (rowIndex * 0.15) // Fades out consecutive rows
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style jsx>{`
                .skeleton {
                    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}
