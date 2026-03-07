import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentSession, ToolCall, Span } from '@agentlens/common';

/**
 * RL Reward Service — Q-Learning for Tool Optimization
 *
 * Uses a simplified Q-learning approach to learn which tool sequences
 * lead to successful outcomes. Instead of a neural network, we maintain
 * a Q-value table indexed by (tool_name, context) pairs.
 *
 * Reward Signal:
 *   R = w1 * success_bonus + w2 * efficiency_score + w3 * loop_penalty
 *
 * Where:
 *   - success_bonus: +1 for session success, -0.5 for failure
 *   - efficiency_score: token budget utilization (lower = better)
 *   - loop_penalty: -0.3 per detected loop pattern
 *
 * Q-Update (simplified):
 *   Q(tool) = Q(tool) + α * (reward - Q(tool))
 *
 *   α (learning rate) = 0.1
 *   Bootstrapped from moving average of past session outcomes.
 */

interface QTableEntry {
    toolName: string;
    qValue: number;
    actionCount: number;
    totalReward: number;
    avgReward: number;
    lastUpdated: Date;
}

interface ToolSequenceReward {
    sessionId: string;
    toolSequence: string[];
    reward: number;
    tokenEfficiency: number;
    success: boolean;
}

@Injectable()
export class RLRewardService {
    private readonly logger = new Logger(RLRewardService.name);
    private readonly LEARNING_RATE = 0.1;
    private readonly DISCOUNT_FACTOR = 0.95;

    // In-memory Q-table (persisted via periodic snapshots to DB)
    // Production: use Redis or a dedicated table
    private qTable: Map<string, QTableEntry> = new Map();

    // Reward weights
    private readonly REWARD_WEIGHTS = {
        success: 1.0,
        tokenEfficiency: 0.3,
        loopPenalty: -0.3,
        speedBonus: 0.2,
    };

    constructor(
        @InjectRepository(AgentSession)
        private readonly sessionRepo: Repository<AgentSession>,
        @InjectRepository(ToolCall)
        private readonly toolCallRepo: Repository<ToolCall>,
        @InjectRepository(Span)
        private readonly spanRepo: Repository<Span>,
    ) { }

    /**
     * Compute reward signal for a completed session.
     * Called after session ends to update Q-values.
     */
    async computeSessionReward(sessionId: string): Promise<number> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session || session.status === 'active') return 0;

        // Get tool calls for this session
        const toolCalls = await this.toolCallRepo.query(
            `SELECT tc.tool_name, tc.output_status, tc.is_retry, tc.duration_ms
       FROM tool_calls tc
       INNER JOIN spans s ON s.id = tc.span_id
       WHERE s.session_id = $1
       ORDER BY tc.created_at ASC`,
            [sessionId],
        );

        if (toolCalls.length === 0) return 0;

        // ── Compute reward components ──

        // 1. Success bonus
        const successBonus = session.status === 'success' ? 1.0 : -0.5;

        // 2. Token efficiency (ratio of useful tokens to total)
        const totalTokens = session.totalInputTokens + session.totalOutputTokens;
        const maxReasonableTokens = 50000; // Budget ceiling
        const tokenEfficiency = 1 - Math.min(totalTokens / maxReasonableTokens, 1);

        // 3. Loop penalty
        const loopPenalty = session.loopDetected ? this.REWARD_WEIGHTS.loopPenalty : 0;

        // 4. Speed bonus (faster = better, capped)
        const durationMs = session.endedAt
            ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
            : 0;
        const maxReasonableDuration = 300000; // 5 min
        const speedBonus = durationMs > 0
            ? (1 - Math.min(durationMs / maxReasonableDuration, 1)) * this.REWARD_WEIGHTS.speedBonus
            : 0;

        // ── Aggregate reward ──
        const reward =
            this.REWARD_WEIGHTS.success * successBonus +
            this.REWARD_WEIGHTS.tokenEfficiency * tokenEfficiency +
            loopPenalty +
            speedBonus;

        // ── Update Q-values for each tool used ──
        const toolNames = [...new Set(toolCalls.map((tc: any) => tc.tool_name))];
        for (const toolName of toolNames) {
            this.updateQValue(toolName as string, reward);
        }

        // ── Update sequence Q-value (tool path learning) ──
        const toolSequence = toolCalls.map((tc: any) => tc.tool_name);
        this.updateSequenceReward(sessionId, toolSequence as string[], reward, tokenEfficiency, session.status === 'success');

        this.logger.debug(
            `Session ${sessionId} reward: ${reward.toFixed(3)} ` +
            `(success: ${successBonus}, efficiency: ${tokenEfficiency.toFixed(2)}, ` +
            `loop: ${loopPenalty}, speed: ${speedBonus.toFixed(2)})`,
        );

        return reward;
    }

    /**
     * Q-learning update for a single tool.
     * Q(tool) = Q(tool) + α * (reward - Q(tool))
     */
    private updateQValue(toolName: string, reward: number): void {
        const existing = this.qTable.get(toolName);

        if (existing) {
            // Incremental Q-update
            const newQ = existing.qValue + this.LEARNING_RATE * (reward - existing.qValue);
            const newCount = existing.actionCount + 1;
            const newTotal = existing.totalReward + reward;

            this.qTable.set(toolName, {
                toolName,
                qValue: newQ,
                actionCount: newCount,
                totalReward: newTotal,
                avgReward: newTotal / newCount,
                lastUpdated: new Date(),
            });
        } else {
            // Initialize
            this.qTable.set(toolName, {
                toolName,
                qValue: reward,
                actionCount: 1,
                totalReward: reward,
                avgReward: reward,
                lastUpdated: new Date(),
            });
        }
    }

    /**
     * Track tool sequence rewards for path optimization.
     */
    private updateSequenceReward(
        sessionId: string,
        toolSequence: string[],
        reward: number,
        tokenEfficiency: number,
        success: boolean,
    ): void {
        // Apply discounted rewards backwards through the tool chain
        // (tools closer to the outcome get more credit)
        for (let i = toolSequence.length - 1; i >= 0; i--) {
            const discount = Math.pow(this.DISCOUNT_FACTOR, toolSequence.length - 1 - i);
            const discountedReward = reward * discount;
            this.updateQValue(toolSequence[i], discountedReward);
        }
    }

    /**
     * Get Q-table as sorted insights for the dashboard.
     */
    getInsights(): Array<{
        toolName: string;
        qValue: number;
        actionCount: number;
        avgReward: number;
        recommendation: string;
    }> {
        const entries = Array.from(this.qTable.values());
        entries.sort((a, b) => b.qValue - a.qValue);

        return entries.map((entry) => ({
            toolName: entry.toolName,
            qValue: Math.max(0, Math.min(1, (entry.qValue + 1) / 2)), // Normalize to 0-1
            actionCount: entry.actionCount,
            avgReward: entry.avgReward,
            recommendation: this.generateRecommendation(entry),
        }));
    }

    /**
     * Generate human-readable recommendation based on Q-value analysis.
     */
    private generateRecommendation(entry: QTableEntry): string {
        const normalizedQ = (entry.qValue + 1) / 2; // Normalize to 0-1

        if (normalizedQ >= 0.7) {
            return `High value tool — agents using ${entry.toolName} have consistently better outcomes. ` +
                `Avg reward: ${entry.avgReward.toFixed(2)} across ${entry.actionCount} uses.`;
        } else if (normalizedQ >= 0.4) {
            return `Moderate value — ${entry.toolName} is situationally effective. ` +
                `Monitor retry rates and consider usage guidelines.`;
        } else {
            return `Low efficiency — ${entry.toolName} frequently correlates with session failures. ` +
                `Consider adding guardrails or deprecating.`;
        }
    }

    /**
     * Bootstrap Q-table from historical session data.
     * Runs on startup and periodically to incorporate new data.
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async bootstrapFromHistory(): Promise<void> {
        this.logger.log('Bootstrapping RL Q-table from historical data...');

        const recentSessions = await this.sessionRepo.find({
            where: {},
            order: { startedAt: 'DESC' },
            take: 1000, // Last 1000 sessions
        });

        let updated = 0;
        for (const session of recentSessions) {
            if (session.status !== 'active') {
                await this.computeSessionReward(session.id);
                updated++;
            }
        }

        this.logger.log(`RL bootstrap complete: ${updated} sessions processed, ${this.qTable.size} tools in Q-table`);
    }
}
