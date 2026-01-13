import { Context, Next } from 'hono';
import { WideEvent } from '../index';
import { FullEvent } from '../client';

/**
 * Configuration for tail-based sampling.
 * 
 * @remarks
 * Tail sampling makes the decision AFTER the request completes,
 * allowing you to keep all errors and slow requests while sampling
 * normal traffic. This gives you 100% visibility into problems.
 * 
 * @example
 * ```typescript
 * const sampling: SamplingConfig = {
 *   defaultRate: 0.1,            // Keep 10% of normal requests
 *   alwaysKeepErrors: true,      // But 100% of errors
 *   slowRequestThresholdMs: 500, // And anything slow
 *   alwaysKeepPaths: ['/api/checkout', '/api/payment'],
 *   alwaysKeepUsers: ['usr_vip_123'],
 * };
 * ```
 * 
 * @category Middleware
 */
export interface SamplingConfig {
    /**
     * Base sample rate for normal successful requests.
     * 
     * @remarks
     * Value between 0.0 and 1.0. For example, 0.1 means 10% of
     * successful requests are kept.
     * 
     * @defaultValue `1.0` (keep all)
     */
    defaultRate?: number;

    /**
     * Always keep error responses (4xx/5xx status codes).
     * 
     * @remarks
     * Highly recommended to leave enabled. Errors are rare and
     * you want 100% visibility into failures.
     * 
     * @defaultValue `true`
     */
    alwaysKeepErrors?: boolean;

    /**
     * Always keep requests slower than this threshold.
     * 
     * @remarks
     * Slow requests often indicate problems. This ensures you
     * capture them even at low sample rates.
     * 
     * @defaultValue `2000` (2 seconds)
     */
    slowRequestThresholdMs?: number;

    /**
     * Always keep requests matching these paths.
     * 
     * @remarks
     * Uses substring matching. Useful for critical paths like
     * checkout, payment, or authentication.
     * 
     * @example
     * ```typescript
     * alwaysKeepPaths: ['/api/checkout', '/api/payment', '/auth']
     * ```
     */
    alwaysKeepPaths?: string[];

    /**
     * Always keep requests from these user IDs.
     * 
     * @remarks
     * Useful for debugging specific users or VIP accounts.
     * Requires `user_id` to be set on the event.
     * 
     * @example
     * ```typescript
     * alwaysKeepUsers: ['usr_vip_123', 'usr_debug_456']
     * ```
     */
    alwaysKeepUsers?: string[];
}

/**
 * Configuration for the wide logger middleware.
 * 
 * @example Minimal Config
 * ```typescript
 * wideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'checkout-api',
 * })
 * ```
 * 
 * @example Full Config
 * ```typescript
 * wideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'checkout-api',
 *   environment: 'production',
 *   region: 'us-east-1',
 *   sampling: {
 *     defaultRate: 0.1,
 *     alwaysKeepErrors: true,
 *     slowRequestThresholdMs: 500,
 *   },
 * })
 * ```
 * 
 * @category Middleware
 */
export interface WideLoggerConfig {
    /**
     * Your FullEvent API key.
     * 
     * @remarks
     * Get this from your FullEvent dashboard under Project Settings → API Keys.
     */
    apiKey: string;

    /**
     * Service name to tag all events with.
     * 
     * @remarks
     * Used for filtering and grouping in the dashboard.
     * Examples: 'checkout-api', 'user-service', 'payment-worker'
     */
    service: string;

    /**
     * Base URL for the FullEvent API.
     * 
     * @defaultValue `'https://api.fullevent.io'`
     * 
     * @remarks
     * Only override for self-hosted deployments or local development.
     */
    baseUrl?: string;

    /**
     * Environment tag for all events.
     * 
     * @defaultValue `process.env.NODE_ENV` or `'development'`
     */
    environment?: string;

    /**
     * Region tag for all events.
     * 
     * @remarks
     * Useful for multi-region deployments. Examples: 'us-east-1', 'eu-west-1'
     */
    region?: string;

    /**
     * Sampling configuration for tail-based sampling.
     * 
     * @see {@link SamplingConfig}
     */
    sampling?: SamplingConfig;
}

/**
 * Type for Hono context variables.
 * 
 * @remarks
 * Use this to type your Hono app for proper TypeScript support.
 * 
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { wideLogger, WideEventVariables } from '@fullevent/node-sdk';
 * 
 * const app = new Hono<{ Variables: WideEventVariables }>();
 * 
 * app.use(wideLogger({ apiKey: '...', service: 'my-api' }));
 * 
 * app.get('/', (c) => {
 *   const event = c.get('wideEvent'); // Properly typed!
 *   event.user_id = 'usr_123';
 *   return c.text('Hello!');
 * });
 * ```
 * 
 * @category Middleware
 */
export type WideEventVariables = {
    /** The wide event for the current request */
    wideEvent: WideEvent;
};

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

    // Random sample the rest
    return Math.random() < defaultRate;
}

/**
 * Hono middleware for Wide Event logging.
 * 
 * @remarks
 * Creates a single, rich event per request that captures the complete context.
 * The event is initialized with request data and automatically finalized with
 * status, duration, and outcome. Your handlers enrich it with business context.
 * 
 * ## How It Works
 * 
 * 1. **Request Start**: Middleware creates the event with request context
 * 2. **Handler Runs**: Your code enriches the event via `c.get('wideEvent')`
 * 3. **Request End**: Middleware adds status/duration and sends to FullEvent
 * 
 * ## Features
 * 
 * - **Automatic context capture**: method, path, status, duration, errors
 * - **Distributed tracing**: Propagates `x-fullevent-trace-id` headers
 * - **Tail-based sampling**: 100% error visibility at any sample rate
 * - **Fire and forget**: Non-blocking, won't slow down your responses
 * 
 * @param config - Middleware configuration
 * @returns Hono middleware function
 * 
 * @example Quick Start
 * ```typescript
 * import { Hono } from 'hono';
 * import { wideLogger, WideEventVariables } from '@fullevent/node-sdk';
 * 
 * const app = new Hono<{ Variables: WideEventVariables }>();
 * 
 * app.use(wideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'checkout-api',
 * }));
 * ```
 * 
 * @example Enriching Events
 * ```typescript
 * app.post('/checkout', async (c) => {
 *   const event = c.get('wideEvent');
 *   
 *   // Add user context
 *   event.user = {
 *     id: user.id,
 *     subscription: user.plan,
 *     account_age_days: daysSince(user.createdAt),
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
 *   return c.json({ orderId: payment.orderId });
 * });
 * ```
 * 
 * @example With Sampling
 * ```typescript
 * app.use(wideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'checkout-api',
 *   sampling: {
 *     defaultRate: 0.1,           // 10% of normal traffic
 *     alwaysKeepErrors: true,     // 100% of errors
 *     slowRequestThresholdMs: 500, // Slow requests
 *     alwaysKeepPaths: ['/api/checkout'], // Critical paths
 *   },
 * }));
 * ```
 * 
 * @category Middleware
 */
export const wideLogger = (config: WideLoggerConfig) => {
    const client = new FullEvent({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
    });

    return async (c: Context<{ Variables: WideEventVariables }>, next: Next) => {
        const startTime = Date.now();

        // Distributed Tracing: Use existing trace ID or generate a new one
        const requestId = c.req.header('x-fullevent-trace-id')
            || c.req.header('x-request-id')
            || crypto.randomUUID();

        // Initialize the Wide Event with request context
        const event: WideEvent = {
            request_id: requestId,
            trace_id: requestId,
            timestamp: new Date().toISOString(),
            method: c.req.method,
            path: c.req.path,
            service: config.service,
            environment: config.environment || process.env.NODE_ENV || 'development',
            region: config.region,
        };

        // Make the event accessible to handlers for enrichment
        c.set('wideEvent', event);

        // Propagate the trace ID in response headers
        c.res.headers.set('x-fullevent-trace-id', requestId);

        try {
            await next();
            event.status_code = c.res.status;
            event.outcome = c.res.status >= 400 ? 'error' : 'success';
        } catch (err: unknown) {
            event.status_code = 500;
            event.outcome = 'error';

            if (err instanceof Error) {
                event.error = {
                    type: err.name || 'Error',
                    message: err.message || String(err),
                    stack: err.stack,
                };
            } else {
                event.error = {
                    type: 'Error',
                    message: String(err),
                };
            }
            throw err;
        } finally {
            event.duration_ms = Date.now() - startTime;

            // Only send if we have an API key and event passes sampling
            if (config.apiKey && shouldSample(event, config.sampling)) {
                // Send to FullEvent API (fire and forget - don't block response)
                client.ingest(
                    `${event.method} ${event.path}`,
                    event,
                    event.timestamp
                ).catch(err => {
                    // Log but don't throw - observability shouldn't break your app
                    console.error('[FullEvent] Failed to send event:', err);
                });
            }
        }
    };
};
