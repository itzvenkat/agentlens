import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * PII Scrubber — runs before persistence to mask sensitive data.
 * 
 * Patterns detected and masked:
 * - Email addresses
 * - API keys / tokens (Bearer, sk_, key_, etc.)
 * - Credit card numbers
 * - SSN-like patterns
 * - File paths containing common sensitive directories
 */
@Injectable()
export class PiiScrubberInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PiiScrubberInterceptor.name);

    private readonly patterns: Array<{ regex: RegExp; replacement: string; label: string }> = [
        {
            regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            replacement: '[EMAIL_REDACTED]',
            label: 'email',
        },
        {
            regex: /(Bearer\s+)[a-zA-Z0-9_\-.]+/gi,
            replacement: '$1[TOKEN_REDACTED]',
            label: 'bearer_token',
        },
        {
            regex: /(sk_|pk_|key_|api_|token_)[a-zA-Z0-9_\-.]{8,}/gi,
            replacement: '[API_KEY_REDACTED]',
            label: 'api_key',
        },
        {
            regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
            replacement: '[CARD_REDACTED]',
            label: 'credit_card',
        },
        {
            regex: /\b\d{3}-\d{2}-\d{4}\b/g,
            replacement: '[SSN_REDACTED]',
            label: 'ssn',
        },
        {
            regex: /\/(?:home|Users|root)\/[^\s"'}\]]+/g,
            replacement: '[PATH_REDACTED]',
            label: 'file_path',
        },
    ];

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();

        if (request.body) {
            request.body = this.scrubObject(request.body);
        }

        return next.handle();
    }

    scrubObject(obj: unknown): unknown {
        if (typeof obj === 'string') {
            return this.scrubString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.scrubObject(item));
        }

        if (obj !== null && typeof obj === 'object') {
            const scrubbed: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                // Skip known safe fields
                if (['traceId', 'spanId', 'sessionId', 'type', 'status', 'name'].includes(key)) {
                    scrubbed[key] = value;
                } else {
                    scrubbed[key] = this.scrubObject(value);
                }
            }
            return scrubbed;
        }

        return obj;
    }

    private scrubString(str: string): string {
        let result = str;
        for (const pattern of this.patterns) {
            const before = result;
            result = result.replace(pattern.regex, pattern.replacement);
            if (before !== result) {
                this.logger.debug(`PII scrubbed: ${pattern.label}`);
            }
        }
        return result;
    }
}
