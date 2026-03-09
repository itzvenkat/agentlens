import type { Metadata } from 'next';
import './globals.css';
import DashboardLayout from '@/components/DashboardLayout';

export const metadata: Metadata = {
    title: 'AgentLens — Agentic Observability & Growth Analytics',
    description: 'Understand how autonomous AI agents actually perform. Track success rates, token efficiency, tool usage, and agent retention.',
    keywords: 'AI, LLM, Observability, Analytics, Agents, Next.js, OpenAI, Anthropic',
    authors: [{ name: 'AgentLens' }],
    openGraph: {
        title: 'AgentLens — Agentic Observability & Growth Analytics',
        description: 'Understand how autonomous AI agents actually perform. Track success rates, token efficiency, tool usage, and agent retention.',
        url: 'https://agentlens.example.com',
        siteName: 'AgentLens',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AgentLens — Agentic Observability & Growth Analytics',
        description: 'Understand how autonomous AI agents actually perform.',
    },
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

