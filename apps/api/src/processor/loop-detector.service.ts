import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ToolCall, TelemetryEvent, AgentSession } from '@agentlens/common';

/**
 * Loop Detector — identifies when an agent is stuck in a retry loop.
 * 
 * Detection logic: If the same tool_name + tool_input_hash combination
 * appears more than LOOP_DETECTION_THRESHOLD times in a single session,
 * the session is flagged as loop_detected and an event is emitted.
 */
@Injectable()
export class LoopDetectorService {
    private readonly logger = new Logger(LoopDetectorService.name);
    private readonly threshold: number;

    constructor(
        @InjectRepository(ToolCall)
        private readonly toolCallRepo: Repository<ToolCall>,
        @InjectRepository(TelemetryEvent)
        private readonly eventRepo: Repository<TelemetryEvent>,
        @InjectRepository(AgentSession)
        private readonly sessionRepo: Repository<AgentSession>,
        private readonly configService: ConfigService,
    ) {
        this.threshold = this.configService.get<number>('processor.loopDetectionThreshold', 3);
    }

    async detectLoops(sessionId: string): Promise<boolean> {
        // Find tool call groups that exceed the threshold
        const loops = await this.toolCallRepo.query(
            `SELECT tool_name, tool_input_hash, COUNT(*) as call_count
       FROM tool_calls tc
       INNER JOIN spans s ON s.id = tc.span_id
       WHERE s.session_id = $1
         AND tc.tool_input_hash IS NOT NULL
       GROUP BY tool_name, tool_input_hash
       HAVING COUNT(*) >= $2`,
            [sessionId, this.threshold],
        );

        if (loops.length === 0) return false;

        this.logger.warn(
            `Loop detected in session ${sessionId}: ${loops.length} repeating tool patterns`,
        );

        // Flag the session
        await this.sessionRepo.update(sessionId, { loopDetected: true });

        // Mark retry tool calls
        for (const loop of loops) {
            await this.toolCallRepo.query(
                `UPDATE tool_calls SET is_retry = true, retry_count = $1
         WHERE span_id IN (SELECT id FROM spans WHERE session_id = $2)
           AND tool_name = $3
           AND tool_input_hash = $4`,
                [parseInt(loop.call_count, 10) - 1, sessionId, loop.tool_name, loop.tool_input_hash],
            );
        }

        // Emit loop_detected event
        await this.eventRepo.save(
            this.eventRepo.create({
                sessionId,
                type: 'loop_detected',
                severity: 'critical',
                message: `Detected ${loops.length} repeating tool call patterns (threshold: ${this.threshold})`,
                payload: {
                    loops: loops.map((l: any) => ({
                        toolName: l.tool_name,
                        inputHash: l.tool_input_hash,
                        count: parseInt(l.call_count, 10),
                    })),
                },
            }),
        );

        return true;
    }
}
