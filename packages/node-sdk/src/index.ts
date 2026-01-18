/**
 * @packageDocumentation
 * 
 * # FullEvent Node.js SDK
 * 
 * The official Node.js SDK for FullEvent - the wide event analytics platform.
 * 
 * ## Installation
 * 
 * ```bash
 * npm install @fullevent/node
 * ```
 * 
 * ## Quick Start
 * 
 * ### Direct Event Ingestion
 * 
 * ```typescript
 * import { FullEvent } from '@fullevent/node';
 * 
 * const client = new FullEvent({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 * });
 * 
 * await client.ingest('user.signup', { plan: 'pro' });
 * ```
 * 
 * ### Wide Event Middleware (Recommended)
 * 
 * ```typescript
 * import { Hono } from 'hono';
 * import { wideLogger, WideEventVariables } from '@fullevent/node';
 * 
 * const app = new Hono<{ Variables: WideEventVariables }>();
 * 
 * app.use(wideLogger({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   service: 'my-api',
 * }));
 * 
 * app.post('/checkout', async (c) => {
 *   const event = c.get('wideEvent');
 *   event.user = { id: user.id, plan: user.plan };
 *   event.cart = { total_cents: cart.total, items: cart.items.length };
 *   return c.json({ success: true });
 * });
 * ```
 * 
 * @module @fullevent/node
 */

export * from './middleware/hono';
export * from './middleware/express';
export * from './client';
export * from './builder';

/**
 * A Wide Event captures the complete context of a request in a single,
 * self-describing record.
 * 
 * @remarks
 * Instead of emitting many small logs, you build one rich event throughout
 * the request lifecycle and emit it at the end. This makes debugging and
 * analytics significantly easier.
 * 
 * ## The Wide Event Pattern
 * 
 * 1. **Initialize**: Middleware creates the event with request context
 * 2. **Enrich**: Handlers add business context throughout the request
 * 3. **Emit**: Middleware sends the complete event when the request ends
 * 
 * ## Auto-Captured Fields
 * 
 * The middleware automatically captures:
 * - `request_id`, `trace_id` - For distributed tracing
 * - `timestamp` - When the request started
 * - `method`, `path` - HTTP method and path
 * - `status_code` - HTTP response status
 * - `duration_ms` - Total request duration
 * - `outcome` - 'success' or 'error'
 * - `service`, `environment`, `region` - Infrastructure context
 * 
 * ## Your Business Context
 * 
 * Add any fields your application needs:
 * 
 * ```typescript
 * event.user = { id: 'usr_123', plan: 'premium', ltv_cents: 50000 };
 * event.cart = { id: 'cart_xyz', items: 3, total_cents: 15999 };
 * event.payment = { provider: 'stripe', method: 'card', latency_ms: 234 };
 * event.feature_flags = { new_checkout: true };
 * event.experiment = { name: 'pricing_v2', variant: 'control' };
 * ```
 * 
 * @example Basic Wide Event
 * ```typescript
 * const event: WideEvent = {
 *   // Auto-captured by middleware
 *   request_id: 'req_abc123',
 *   timestamp: '2024-01-15T10:23:45.612Z',
 *   method: 'POST',
 *   path: '/api/checkout',
 *   service: 'checkout-api',
 *   status_code: 200,
 *   duration_ms: 847,
 *   outcome: 'success',
 *   
 *   // Your business context
 *   user: { id: 'usr_456', plan: 'premium' },
 *   cart: { total_cents: 15999, items: 3 },
 *   payment: { provider: 'stripe', latency_ms: 234 },
 * };
 * ```
 * 
 * @category Types
 */
export interface WideEvent {
    // ═══════════════════════════════════════════════════════════════════════════
    // Core Request Context (auto-populated by middleware)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Unique identifier for this request.
     * 
     * @remarks
     * Auto-generated or extracted from `x-request-id` / `x-fullevent-trace-id` headers.
     */
    request_id?: string;

    /**
     * Trace ID for distributed tracing.
     * 
     * @remarks
     * Propagated across service boundaries via the `x-fullevent-trace-id` header.
     * Same as `request_id` by default.
     * 
     * @see {@link https://fullevent.io/docs/distributed-tracing | Distributed Tracing Guide}
     */
    trace_id?: string;

    /**
     * ISO timestamp when the request started.
     */
    timestamp: string;

    /**
     * HTTP method (GET, POST, PUT, DELETE, etc.)
     */
    method: string;

    /**
     * Request path (e.g., `/api/checkout`)
     */
    path: string;

    /**
     * HTTP status code.
     * 
     * @remarks
     * Auto-captured from the response. Used for error rate calculations.
     */
    status_code?: number;

    /**
     * Request duration in milliseconds.
     * 
     * @remarks
     * Auto-captured by middleware in the `finally` block.
     */
    duration_ms?: number;

    /**
     * Request outcome: 'success' or 'error'.
     * 
     * @remarks
     * Auto-set based on `status_code` (>= 400 = error).
     * Can be overridden manually.
     */
    outcome?: 'success' | 'error';

    // ═══════════════════════════════════════════════════════════════════════════
    // Infrastructure Context
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Service name (e.g., 'checkout-api', 'user-service').
     * 
     * @remarks
     * Set via middleware config. Used for filtering and grouping.
     */
    service: string;

    /**
     * Deployment region (e.g., 'us-east-1', 'eu-west-1').
     */
    region?: string;

    /**
     * Environment (e.g., 'production', 'staging', 'development').
     * 
     * @remarks
     * Defaults to `NODE_ENV` if not specified.
     */
    environment?: string;

    // ═══════════════════════════════════════════════════════════════════════════
    // Common Context Fields
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * User identifier.
     * 
     * @remarks
     * The most commonly enriched field. For richer user context,
     * add a `user` object with additional properties.
     */
    user_id?: string;

    // ═══════════════════════════════════════════════════════════════════════════
    // Error Details
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Structured error information.
     * 
     * @remarks
     * Auto-populated when an exception is thrown. Can also be set manually
     * for handled errors (e.g., payment failures).
     * 
     * @example
     * ```typescript
     * event.error = {
     *   type: 'PaymentError',
     *   code: 'card_declined',
     *   message: 'Your card was declined',
     *   stripe_decline_code: 'insufficient_funds',
     * };
     * ```
     */
    error?: {
        /** Error class/type name (e.g., 'TypeError', 'PaymentError') */
        type: string;
        /** Human-readable error message */
        message: string;
        /** Stack trace (auto-captured for thrown errors) */
        stack?: string;
        /** Error code (e.g., 'ECONNREFUSED', 'card_declined') */
        code?: string;
        /** Additional error context */
        [key: string]: unknown;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // Your Business Context
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Dynamic business context.
     * 
     * @remarks
     * Add any fields your application needs. Common patterns:
     * 
     * - `user` - User context (id, plan, ltv, etc.)
     * - `cart` - Shopping cart (id, items, total, coupon)
     * - `payment` - Payment details (provider, method, latency)
     * - `order` - Order details (id, status, items)
     * - `feature_flags` - Feature flag states
     * - `experiment` - A/B test assignments
     * - `llm` - LLM usage (model, tokens, latency)
     */
    [key: string]: unknown;
}
