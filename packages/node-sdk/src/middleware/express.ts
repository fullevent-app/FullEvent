import { Request, Response, NextFunction } from 'express';
import { WideEvent } from '../index';
import { FullEvent } from '../client';
import { SamplingConfig, WideLoggerConfig } from './hono';

// Extend Express Request to include wideEvent
declare global {
    namespace Express {
        interface Request {
            /** The wide event for the current request */
            wideEvent: WideEvent;
        }
    }
}

/**
 * Determines whether to keep this event based on sampling config.
 * Uses tail-based sampling: decision made AFTER request completes.
 * 
 * @internal
 */
function shouldSample(event: WideEvent, config?: SamplingConfig): boolean {
    const sampling = config ?? {};
    const defaultRate = sampling.defaultRate ?? 1.0;
    const alwaysKeepErrors = sampling.alwaysKeepErrors ?? true;
    const slowThreshold = sampling.slowRequestThresholdMs ?? 2000;

    // Always keep errors (4xx/5xx or explicit error outcome)
    if (alwaysKeepErrors) {
        if (event.outcome === 'error') return true;
        if (event.status_code && event.status_code >= 400) return true;
    }

    // Always keep slow requests
    if (event.duration_ms && event.duration_ms > slowThreshold) return true;

    // Always keep specific paths
    if (sampling.alwaysKeepPaths?.some(p => event.path.includes(p))) return true;

    // Always keep specific users
    if (event.user_id && sampling.alwaysKeepUsers?.includes(String(event.user_id))) return true;

    // Consistent Sampling based on Trace ID
    // DJB2 hash for simple, string-based consistency
    if (event.trace_id) {
        let hash = 5381;
        const str = event.trace_id;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        // Normalize to 0.0 - 1.0 (using 10000 for 4 decimal precision)
        const normalized = (hash >>> 0) % 10000 / 10000;
        return normalized < defaultRate;
    }

    // Fallback if no trace ID (shouldn't happen usually)
    return Math.random() < defaultRate;
}

/**
 * Express middleware for Wide Event logging.
 * 
 * @remarks
 * Creates a single, rich event per request that captures the complete context.
 * The event is initialized with request data and automatically finalized with
 * status, duration, and outcome. Your handlers enrich it with business context.
 * 
 * ## How It Works
 * 
 * 1. **Request Start**: Middleware creates the event with request context
 * 2. **Handler Runs**: Your code enriches the event via `req.wideEvent`
 * 3. **Response Finish**: Middleware adds status/duration and sends to FullEvent
 * 
 * ## Features
 * 
 * - **Automatic context capture**: method, path, status, duration
 * - **Distributed tracing**: Propagates `x-fullevent-trace-id` headers
 * - **Tail-based sampling**: 100% error visibility at any sample rate
 * - **Fire and forget**: Non-blocking, won't slow down your responses
 * 
 * @param config - Middleware configuration
 * @returns Express middleware function
 * 
 * @example Quick Start
 * ```typescript
 * import express from 'express';
 * import { expressWideLogger } from '@fullevent/node';
 * 
 * const app = express();
 * 
 * app.use(expressWideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'checkout-api',
 * }));
 * ```
 * 
 * @example Enriching Events
 * ```typescript
 * app.post('/checkout', async (req, res) => {
 *   const event = req.wideEvent;
 *   
 *   // Add user context
 *   event.user = {
 *     id: req.user.id,
 *     subscription: req.user.plan,
 *   };
 *   
 *   // Add cart context
 *   event.cart = {
 *     id: cart.id,
 *     item_count: cart.items.length,
 *     total_cents: cart.total,
 *   };
 *   
 *   // Add payment timing
 *   const paymentStart = Date.now();
 *   const payment = await processPayment(cart);
 *   event.payment = {
 *     provider: 'stripe',
 *     latency_ms: Date.now() - paymentStart,
 *   };
 *   
 *   res.json({ orderId: payment.orderId });
 * });
 * ```
 * 
 * @example With Sampling
 * ```typescript
 * app.use(expressWideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'checkout-api',
 *   sampling: {
 *     defaultRate: 0.1,           // 10% of normal traffic
 *     alwaysKeepErrors: true,     // 100% of errors
 *     slowRequestThresholdMs: 500, // Slow requests
 *   },
 * }));
 * ```
 * 
 * @category Middleware
 */
export function expressWideLogger(config: WideLoggerConfig) {
    const client = new FullEvent({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
    });

    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();

        // Distributed Tracing: Use existing trace ID or generate a new one
        const requestId = (req.headers['x-fullevent-trace-id'] as string)
            || (req.headers['x-request-id'] as string)
            || crypto.randomUUID();

        // Initialize the Wide Event with request context
        const event: WideEvent = {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            service: config.service,
            environment: config.environment || process.env.NODE_ENV || 'development',
            region: config.region,
        };

        // Make the event accessible to handlers for enrichment
        req.wideEvent = event;

        // Propagate the trace ID in response headers
        res.setHeader('x-fullevent-trace-id', requestId);

        // Capture response finish to record status and send event
        res.on('finish', () => {
            event.status_code = res.statusCode;
            event.outcome = res.statusCode >= 400 ? 'error' : 'success';
            event.duration_ms = Date.now() - startTime;

            // Only send if we have an API key and event passes sampling
            if (config.apiKey && shouldSample(event, config.sampling)) {
                client.ingest(
                    `${event.method} ${event.path}`,
                    event,
                    event.timestamp
                ).catch(err => {
                    console.error('[FullEvent] Failed to send event:', err);
                });
            }
        });

        next();
    };
}
