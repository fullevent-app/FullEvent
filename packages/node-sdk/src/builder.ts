import { WideEvent } from './index';

/**
 * A fluent builder for enriching wide events throughout the request lifecycle.
 * 
 * @remarks
 * While you can modify the event object directly (and that's perfectly fine),
 * the builder provides chainable methods for cleaner code and useful helpers.
 * 
 * ## Two Approaches
 * 
 * **Direct access (simple):**
 * ```typescript
 * const event = c.get('wideEvent');
 * event.user = { id: user.id, plan: user.plan };
 * event.cart = { total: cart.total, items: cart.items.length };
 * ```
 * 
 * **Builder pattern (chainable):**
 * ```typescript
 * new WideEventBuilder(c.get('wideEvent'))
 *   .setContext('user', { id: user.id, plan: user.plan })
 *   .setContext('cart', { total: cart.total, items: cart.items.length })
 *   .setTiming('db_latency_ms', dbStart);
 * ```
 * 
 * @example Full Example
 * ```typescript
 * const builder = new WideEventBuilder(c.get('wideEvent'));
 * 
 * builder
 *   .setUser(user.id)
 *   .setContext('user', {
 *     subscription: user.plan,
 *     account_age_days: daysSince(user.createdAt),
 *     lifetime_value_cents: user.ltv,
 *   })
 *   .setContext('cart', {
 *     id: cart.id,
 *     item_count: cart.items.length,
 *     total_cents: cart.total,
 *   });
 * 
 * // Later, after payment processing
 * builder
 *   .setContext('payment', { method: 'card', provider: 'stripe' })
 *   .setTiming('payment_latency_ms', paymentStart);
 * 
 * if (paymentError) {
 *   builder.setError({
 *     type: 'PaymentError',
 *     code: paymentError.code,
 *     message: paymentError.message,
 *     stripe_decline_code: paymentError.declineCode,
 *   });
 * }
 * ```
 * 
 * @category Builder
 */
export class WideEventBuilder {
    /**
     * Creates a new builder wrapping the given event.
     * 
     * @param event - The wide event to enrich
     */
    constructor(private event: WideEvent) {}

    /**
     * Returns the underlying event object for direct access.
     * 
     * @returns The wrapped WideEvent
     * 
     * @example
     * ```typescript
     * const event = builder.getEvent();
     * console.log(event.user_id);
     * ```
     */
    getEvent(): WideEvent {
        return this.event;
    }

    /**
     * Sets any key-value pair on the event.
     * 
     * @param key - Property name
     * @param value - Property value (any type)
     * @returns `this` for chaining
     * 
     * @example
     * ```typescript
     * builder
     *   .set('order_id', 'ord_123')
     *   .set('llm_model', 'gpt-4')
     *   .set('tokens_used', 1500);
     * ```
     */
    set(key: string, value: unknown): this {
        this.event[key] = value;
        return this;
    }

    /**
     * Sets a named context object on the event.
     * 
     * @remarks
     * This is the primary method for adding structured business context.
     * Each context is a nested object that groups related properties.
     * 
     * @param name - Context name (e.g., 'user', 'cart', 'payment')
     * @param data - Context data as key-value pairs
     * @returns `this` for chaining
     * 
     * @example
     * ```typescript
     * builder
     *   .setContext('user', {
     *     id: 'user_456',
     *     subscription: 'premium',
     *     account_age_days: 847,
     *   })
     *   .setContext('cart', {
     *     id: 'cart_xyz',
     *     item_count: 3,
     *     total_cents: 15999,
     *   })
     *   .setContext('payment', {
     *     method: 'card',
     *     provider: 'stripe',
     *   });
     * ```
     */
    setContext(name: string, data: Record<string, unknown>): this {
        this.event[name] = data;
        return this;
    }

    /**
     * Merges additional fields into an existing context object.
     * 
     * @remarks
     * Useful for progressively building context throughout the request.
     * If the context doesn't exist, it will be created.
     * 
     * @param name - Context name to merge into
     * @param data - Additional data to merge
     * @returns `this` for chaining
     * 
     * @example
     * ```typescript
     * // Initial payment context
     * builder.setContext('payment', { method: 'card', provider: 'stripe' });
     * 
     * // After payment completes, add timing
     * builder.mergeContext('payment', {
     *   latency_ms: Date.now() - paymentStart,
     *   attempt: 1,
     *   transaction_id: 'txn_123',
     * });
     * 
     * // Result: { method, provider, latency_ms, attempt, transaction_id }
     * ```
     */
    mergeContext(name: string, data: Record<string, unknown>): this {
        const existing = this.event[name];
        if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
            this.event[name] = { ...(existing as Record<string, unknown>), ...data };
        } else {
            this.event[name] = data;
        }
        return this;
    }

    /**
     * Sets the user ID on the event.
     * 
     * @remarks
     * This sets the top-level `user_id` field, which is commonly used
     * for filtering and user-centric analytics. For richer user context,
     * use `setContext('user', {...})` instead or in addition.
     * 
     * @param userId - The user identifier
     * @returns `this` for chaining
     * 
     * @example
     * ```typescript
     * builder.setUser('usr_123');
     * 
     * // For richer context, also set a user object:
     * builder.setContext('user', {
     *   id: 'usr_123',
     *   plan: 'premium',
     *   ltv_cents: 50000,
     * });
     * ```
     */
    setUser(userId: string): this {
        this.event.user_id = userId;
        return this;
    }

    /**
     * Captures an error with structured details.
     * 
     * @remarks
     * Automatically sets `outcome` to 'error'. Accepts either a native
     * Error object or a custom error object with additional fields.
     * 
     * @param err - Error object or custom error details
     * @returns `this` for chaining
     * 
     * @example Native Error
     * ```typescript
     * try {
     *   await riskyOperation();
     * } catch (err) {
     *   builder.setError(err);
     * }
     * ```
     * 
     * @example Custom Error with Context
     * ```typescript
     * builder.setError({
     *   type: 'PaymentError',
     *   message: 'Card declined by issuer',
     *   code: 'card_declined',
     *   stripe_decline_code: 'insufficient_funds',
     *   card_brand: 'visa',
     *   card_last4: '4242',
     * });
     * ```
     */
    setError(
        err: Error | { type?: string; message: string; code?: string; stack?: string; [key: string]: unknown }
    ): this {
        this.event.outcome = 'error';

        if (err instanceof Error) {
            this.event.error = {
                type: err.name,
                message: err.message,
                stack: err.stack,
            };
        } else {
            const { type, message, code, stack, ...extra } = err;
            this.event.error = {
                type: type || 'Error',
                message,
                code,
                stack,
                ...extra,
            };
        }
        return this;
    }

    /**
     * Sets the HTTP status code and outcome.
     * 
     * @remarks
     * Automatically sets `outcome` based on the status code:
     * - `< 400` → 'success'
     * - `>= 400` → 'error'
     * 
     * @param code - HTTP status code
     * @returns `this` for chaining
     * 
     * @example
     * ```typescript
     * builder.setStatus(404); // outcome = 'error'
     * builder.setStatus(200); // outcome = 'success'
     * ```
     */
    setStatus(code: number): this {
        this.event.status_code = code;
        this.event.outcome = code >= 400 ? 'error' : 'success';
        return this;
    }

    /**
     * Records timing for a specific operation.
     * 
     * @remarks
     * A convenience method for calculating and setting duration values.
     * The value is calculated as `Date.now() - startTime`.
     * 
     * @param key - Property name for the timing (e.g., 'db_latency_ms')
     * @param startTime - Start timestamp from `Date.now()`
     * @returns `this` for chaining
     * 
     * @example
     * ```typescript
     * const dbStart = Date.now();
     * const result = await db.query('SELECT ...');
     * builder.setTiming('db_latency_ms', dbStart);
     * 
     * const paymentStart = Date.now();
     * await processPayment();
     * builder.setTiming('payment_latency_ms', paymentStart);
     * ```
     */
    setTiming(key: string, startTime: number): this {
        this.event[key] = Date.now() - startTime;
        return this;
    }
}
