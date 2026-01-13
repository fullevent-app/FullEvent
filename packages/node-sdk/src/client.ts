import { WideEvent } from './index';

/**
 * Configuration options for the FullEvent client.
 * 
 * @example
 * ```typescript
 * const client = new FullEvent({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 *   baseUrl: 'https://api.fullevent.io', // optional
 *   ping: true, // send a test ping on initialization
 * });
 * ```
 * 
 * @category Client
 */
export interface FullEventConfig {
    /**
     * Your FullEvent project API key.
     * 
     * @remarks
     * Get this from your FullEvent dashboard under Project Settings → API Keys.
     */
    apiKey: string;

    /**
     * Base URL for the FullEvent API.
     * 
     * @defaultValue `'https://api.fullevent.io'`
     * 
     * @remarks
     * Only override this for self-hosted deployments or local development.
     */
    baseUrl?: string;

    /**
     * Send a ping event on initialization to verify connection.
     * 
     * @defaultValue `false`
     * 
     * @remarks
     * Set to `true` during initial setup to verify your SDK configuration
     * is working correctly. The ping is sent asynchronously and won't block
     * your application startup.
     */
    ping?: boolean;
}

/**
 * Standard properties for HTTP request events.
 * 
 * These properties are automatically extracted by FullEvent for first-class
 * filtering, dashboards, and error rate calculations.
 * 
 * @example
 * ```typescript
 * const props: HttpRequestProperties = {
 *   status_code: 200,
 *   method: 'POST',
 *   path: '/api/checkout',
 *   duration_ms: 234,
 *   outcome: 'success',
 *   // Plus any custom properties
 *   user_id: 'usr_123',
 *   order_total: 9999,
 * };
 * ```
 * 
 * @category Client
 */
export interface HttpRequestProperties {
    /**
     * HTTP status code (e.g., 200, 404, 500).
     * 
     * @remarks
     * Used for automatic error rate calculations:
     * - `< 400` = success
     * - `>= 400` = error
     */
    status_code: number;

    /**
     * HTTP method (GET, POST, PUT, DELETE, etc.)
     */
    method?: string;

    /**
     * Request path (e.g., `/api/users`, `/checkout`)
     */
    path?: string;

    /**
     * Request duration in milliseconds.
     */
    duration_ms?: number;

    /**
     * Explicit success/error indicator.
     * 
     * @remarks
     * If set, this takes precedence over `status_code` for error rate calculations.
     */
    outcome?: 'success' | 'error';

    /**
     * Additional custom properties.
     * 
     * @remarks
     * Add any context relevant to your application.
     */
    [key: string]: unknown;
}

/**
 * The main FullEvent client for ingesting events.
 * 
 * @remarks
 * Use this client to send events directly from your application.
 * For automatic request logging, see the middleware integrations:
 * - {@link wideLogger} for Hono
 * - {@link expressWideLogger} for Express
 * 
 * @example Basic Usage
 * ```typescript
 * import { FullEvent } from '@fullevent/node-sdk';
 * 
 * const client = new FullEvent({
 *   apiKey: process.env.FULLEVENT_API_KEY!,
 * });
 * 
 * // Ingest a simple event
 * await client.ingest('user.signup', {
 *   plan: 'pro',
 *   referral: 'newsletter',
 * });
 * ```
 * 
 * @example Fire and Forget
 * ```typescript
 * // Don't await if you don't want to block
 * client.ingest('page.view', { path: '/home' })
 *   .catch(err => console.error('FullEvent error:', err));
 * ```
 * 
 * @category Client
 */
export class FullEvent {
    private apiKey: string;
    private baseUrl: string;

    /**
     * Creates a new FullEvent client instance.
     * 
     * @param config - Configuration options
     */
    constructor(config: FullEventConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://api.fullevent.io';

        // Auto-ping if enabled
        if (config.ping) {
            this.ping().catch((err) => {
                console.error('[FullEvent SDK] Auto-ping failed:', err);
            });
        }
    }

    /**
     * Ingest a generic event with any properties.
     * 
     * @param event - Event name/type (e.g., 'user.signup', 'order.completed')
     * @param properties - Key-value pairs of event data
     * @param timestamp - Optional ISO timestamp (defaults to now)
     * @returns Promise resolving to success/error status
     * 
     * @remarks
     * Events are processed asynchronously. The promise resolves when
     * the event is accepted by the API, not when it's fully processed.
     * 
     * @example
     * ```typescript
     * await client.ingest('checkout.completed', {
     *   order_id: 'ord_123',
     *   total_cents: 9999,
     *   items: 3,
     *   user: {
     *     id: 'usr_456',
     *     plan: 'premium',
     *   },
     * });
     * ```
     */
    async ingest(
        event: string,
        properties: Record<string, unknown> = {},
        timestamp?: string
    ): Promise<{ success: boolean; error?: unknown }> {
        try {
            const response = await fetch(`${this.baseUrl}/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    event,
                    properties,
                    timestamp: timestamp || new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[FullEvent SDK] Ingestion failed:', error);
                return { success: false, error };
            }

            return { success: true };
        } catch (error) {
            console.error('[FullEvent SDK] Network error during ingestion:', error);
            return { success: false, error };
        }
    }

    /**
     * Ingest an HTTP request event with typed properties.
     * 
     * @param properties - HTTP request properties with optional custom data
     * @param timestamp - Optional ISO timestamp (defaults to now)
     * @returns Promise resolving to success/error status
     * 
     * @remarks
     * This is a convenience method that provides TypeScript autocomplete
     * for standard HTTP properties. Under the hood, it calls `ingest()`
     * with the event type `'http_request'`.
     * 
     * @example
     * ```typescript
     * await client.ingestHttpRequest({
     *   status_code: 200,
     *   method: 'POST',
     *   path: '/api/checkout',
     *   duration_ms: 234,
     *   outcome: 'success',
     *   // Custom properties
     *   user_id: 'usr_123',
     * });
     * ```
     */
    async ingestHttpRequest(
        properties: HttpRequestProperties,
        timestamp?: string
    ): Promise<{ success: boolean; error?: unknown }> {
        return this.ingest('http_request', properties, timestamp);
    }

    /**
     * Ping the FullEvent API to verify connection.
     * 
     * @returns Promise resolving to connection status with latency
     * 
     * @remarks
     * Use this method to verify your SDK is correctly configured.
     * It sends a lightweight ping event and measures round-trip latency.
     * Commonly used during setup or in health check endpoints.
     * 
     * @example Basic ping
     * ```typescript
     * const result = await client.ping();
     * if (result.success) {
     *   console.log(`Connected! Latency: ${result.latency_ms}ms`);
     * } else {
     *   console.error('Connection failed:', result.error);
     * }
     * ```
     * 
     * @example Health check endpoint
     * ```typescript
     * app.get('/health', async (c) => {
     *   const ping = await fullevent.ping();
     *   return c.json({
     *     status: ping.success ? 'healthy' : 'degraded',
     *     fullevent: ping,
     *   });
     * });
     * ```
     */
    async ping(): Promise<{ success: boolean; latency_ms?: number; error?: unknown }> {
        const start = Date.now();

        try {
            const result = await this.ingest('fullevent.ping', {
                // Standard wide event properties
                status_code: 200,
                outcome: 'success',
                duration_ms: 0, // Will be updated after

                // SDK info
                sdk: '@fullevent/node-sdk',
                sdk_version: '1.0.0',

                // Runtime info
                runtime: typeof process !== 'undefined' ? 'node' : 'browser',
                node_version: typeof process !== 'undefined' ? process.version : undefined,
                platform: typeof process !== 'undefined' ? process.platform : 'browser',

                // Ping metadata
                ping_type: 'connection_test',
                message: '🎉 Your first event! FullEvent is connected and ready.',
            });

            const latency_ms = Date.now() - start;

            if (result.success) {
                return { success: true, latency_ms };
            } else {
                return { success: false, latency_ms, error: result.error };
            }
        } catch (error) {
            const latency_ms = Date.now() - start;
            return { success: false, latency_ms, error };
        }
    }
}

