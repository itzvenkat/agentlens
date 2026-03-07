import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '@agentlens/common';
import { LoopDetectorService } from './loop-detector.service';
import { RLRewardService } from './rl-reward.service';

@Processor(QUEUE_NAMES.TELEMETRY)
export class TelemetryProcessor extends WorkerHost {
    private readonly logger = new Logger(TelemetryProcessor.name);

    constructor(
        private readonly loopDetector: LoopDetectorService,
        private readonly rlReward: RLRewardService,
    ) {
        super();
    }

    async process(job: Job<{ sessionId: string; projectId: string }>): Promise<void> {
        const { sessionId, projectId } = job.data;
        this.logger.debug(`Processing batch for session: ${sessionId}`);

        try {
            // Run loop detection
            const loopFound = await this.loopDetector.detectLoops(sessionId);
            if (loopFound) {
                this.logger.warn(`🔄 Loop detected in session ${sessionId} (project: ${projectId})`);
            }

            // Compute RL reward for the session
            const reward = await this.rlReward.computeSessionReward(sessionId);
            this.logger.debug(`🧠 RL reward for session ${sessionId}: ${reward.toFixed(3)}`);
        } catch (error) {
            this.logger.error(`Failed to process batch: ${(error as Error).message}`, (error as Error).stack);
            throw error; // Let BullMQ retry
        }
    }
}
