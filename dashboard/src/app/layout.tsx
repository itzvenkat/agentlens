import type { Metadata } from 'next';
import './globals.css';
import DashboardLayout from '@/components/DashboardLayout';

export const metadata: Metadata = {
    title: 'AgentLens — Agentic Observability & Growth Analytics',
    description: 'Understand how autonomous AI agents actually perform. Track success rates, token efficiency, tool usage, and agent retention.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <DashboardLayout>{children}</DashboardLayout>
            </body>
        </html>
    );
}
