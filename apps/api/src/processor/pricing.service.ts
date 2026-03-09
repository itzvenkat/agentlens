import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ModelPricing {
    inputCostPerToken: number;
    outputCostPerToken: number;
}

@Injectable()
export class PricingService implements OnModuleInit {
    private readonly logger = new Logger(PricingService.name);

    // In-memory cache mapping model names (e.g. "gpt-4o") to token prices
    private pricingCache = new Map<string, ModelPricing>();

    // LiteLLM maintains a heavily updated, open-source registry of all known model prices
    private readonly LITELLM_PRICING_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

    async onModuleInit() {
        // Fetch immediately on boot so ingest pipeline has data ready
        await this.syncPricingRegistry();
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCron() {
        await this.syncPricingRegistry();
    }

    private async syncPricingRegistry() {
        this.logger.log('Fetching latest LLM pricing registry from LiteLLM...');
        try {
            const response = await fetch(this.LITELLM_PRICING_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch pricing: ${response.statusText}`);
            }

            const data = await response.json();
            let parsedCount = 0;

            for (const [modelName, details] of Object.entries(data)) {
                if (details && typeof details === 'object' && 'input_cost_per_token' in details && 'output_cost_per_token' in details) {
                    this.pricingCache.set(modelName, {
                        inputCostPerToken: Number(details.input_cost_per_token) || 0,
                        outputCostPerToken: Number(details.output_cost_per_token) || 0,
                    });
                    parsedCount++;
                }
            }

            this.logger.log(`Successfully cached real-time pricing for ${parsedCount} AI models.`);
        } catch (error) {
            this.logger.error('Failed to sync pricing registry. System will fall back to $0 costs if map is empty.', (error as Error).stack);
        }
    }

    /**
     * Calculates the total USD cost for a given model and token counts.
     * Performs fuzzy matching (e.g. removing "openai/" prefixes) if necessary.
     */
    calculateCost(model: string | null, inputTokens: number, outputTokens: number): number {
        if (!model) return 0;

        let pricing = this.pricingCache.get(model);

        // Fuzzy matching: If the user passed "openai/gpt-4o", strip the provider prefix since LiteLLM just uses "gpt-4o" for OpenAI
        if (!pricing && model.includes('/')) {
            const stripped = model.split('/').pop()!;
            pricing = this.pricingCache.get(stripped);
        }

        if (!pricing) {
            // Unrecognized model (e.g. local Ollama)
            return 0;
        }

        const inputCost = inputTokens * pricing.inputCostPerToken;
        const outputCost = outputTokens * pricing.outputCostPerToken;

        return inputCost + outputCost;
    }
}
