/**
 * FullEvent Schema V2: TRUE Wide Events
 * 
 * Philosophy: Wide events are COLUMNS, not JSON blobs.
 * 
 * The user's event IS the schema. When they send:
 *   { "user_id": "123", "subscription": "premium", "cart.total": 150 }
 * 
 * They can query:
 *   WHERE user_id = '123' AND subscription = 'premium' AND cart.total > 100
 * 
 * NOT:
 *   WHERE JSONExtract(payload, 'user_id') = '123'  ❌
 *   WHERE string_props['subscription'] = 'premium'  ❌
 * 
 * How? ClickHouse JSON column type (23.1+) automatically creates
 * typed sub-columns for every field in the JSON.
 */

export const SCHEMA_V2_DDL = `
-- TRUE WIDE EVENT SCHEMA
-- The 'event' column IS the wide event - all fields become queryable columns
CREATE TABLE IF NOT EXISTS events (
    -- ═══════════════════════════════════════════════════════════════
    -- SYSTEM FIELDS (FullEvent metadata)
    -- ═══════════════════════════════════════════════════════════════
    _id UUID DEFAULT generateUUIDv4(),
    _project_id LowCardinality(String),
    _timestamp DateTime64(3),
    _ingested_at DateTime64(3) DEFAULT now64(3),
    _event_type LowCardinality(String),
    
    -- ═══════════════════════════════════════════════════════════════
    -- THE WIDE EVENT (User's data - becomes queryable columns!)
    -- ═══════════════════════════════════════════════════════════════
    -- 
    -- ClickHouse JSON column automatically:
    -- 1. Infers types for each field (String, Int, Float, Bool, etc.)
    -- 2. Creates virtual sub-columns for nested objects
    -- 3. Allows direct column-style queries: event.user_id = '123'
    -- 4. Supports GROUP BY, ORDER BY, aggregations on any field
    --
    -- Note: JSON columns cannot be used in ORDER BY or as bloom filter index targets
    -- Querying on event.field paths still works efficiently via ClickHouse's internal indexing
    --
    event JSON
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(_timestamp)
ORDER BY (_project_id, _timestamp, _event_type)
SETTINGS index_granularity = 8192;
`;

/**
 * Alternative schema using Object('json') for older ClickHouse versions
 * or if JSON column has issues
 */
export const SCHEMA_V2_OBJECT_DDL = `
CREATE TABLE IF NOT EXISTS events (
    _id UUID DEFAULT generateUUIDv4(),
    _project_id LowCardinality(String),
    _timestamp DateTime64(3),
    _ingested_at DateTime64(3) DEFAULT now64(3),
    _event_type LowCardinality(String),
    
    -- Object type with JSON parsing
    event Object('json')
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(_timestamp)
ORDER BY (_project_id, _timestamp)
SETTINGS index_granularity = 8192;
`;

/**
 * TRUE Wide Event - The user's event IS the schema
 * 
 * No transformation needed. The user sends a JSON object,
 * and every field becomes a queryable column.
 */
export interface WideEventInsert {
    // System fields (prefixed with _ to avoid collision)
    _project_id: string;
    _timestamp: string;
    _event_type: string;

    // The wide event - user's data as-is
    event: Record<string, unknown>;
}

/**
 * Prepare event for insertion
 * 
 * The beauty: We don't transform user properties.
 * We insert them directly and ClickHouse handles the rest.
 */
export function prepareWideEvent(
    projectId: string,
    eventType: string,
    userEvent: Record<string, unknown>
): WideEventInsert {
    return {
        _project_id: projectId,
        _timestamp: (userEvent.timestamp as string) || new Date().toISOString(),
        _event_type: eventType,
        // The entire user event becomes queryable columns!
        event: userEvent,
    };
}

/**
 * THESE ARE THE QUERIES THAT NOW WORK
 * 
 * Notice: No JSONExtract, no Map lookups, no string parsing.
 * Just direct column access like the wide events philosophy demands.
 */
export const EXAMPLE_QUERIES = {

    // ═══════════════════════════════════════════════════════════════
    // ERROR RATE BY SUBSCRIPTION TIER
    // ═══════════════════════════════════════════════════════════════
    // Your example: SELECT subscription, COUNT(*) as total, ...
    errorRateBySubscription: `
        SELECT 
            event.subscription AS subscription,
            COUNT(*) AS total,
            SUM(CASE WHEN event.status_code >= 500 THEN 1 ELSE 0 END) AS errors,
            ROUND(errors * 100.0 / total, 2) AS error_rate
        FROM events 
        WHERE _timestamp > now() - INTERVAL 1 HOUR
        GROUP BY subscription
        ORDER BY error_rate DESC
    `,

    // ═══════════════════════════════════════════════════════════════
    // SLOWEST REQUESTS (P99 LATENCY)
    // ═══════════════════════════════════════════════════════════════
    slowestRequests: `
        SELECT 
            event.request_id,
            event.user_id,
            event.path,
            event.duration_ms,
            event.status_code
        FROM events 
        WHERE _timestamp > now() - INTERVAL 1 HOUR
        ORDER BY event.duration_ms DESC 
        LIMIT 10
    `,

    // ═══════════════════════════════════════════════════════════════
    // ERRORS FOR PREMIUM USERS
    // ═══════════════════════════════════════════════════════════════
    // Your example: WHERE subscription = 'premium' AND status_code >= 500
    premiumUserErrors: `
        SELECT * 
        FROM events
        WHERE event.subscription = 'premium' 
          AND event.status_code >= 500
          AND _timestamp > now() - INTERVAL 24 HOUR
        ORDER BY _timestamp DESC
    `,

    // ═══════════════════════════════════════════════════════════════
    // FEATURE FLAG IMPACT ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    // Your example: SELECT feature_flags.new_checkout_flow as new_checkout, ...
    featureFlagImpact: `
        SELECT 
            event.feature_flags.new_checkout_flow AS new_checkout,
            COUNT(*) AS total,
            SUM(CASE WHEN event.status_code >= 500 THEN 1 ELSE 0 END) AS errors,
            ROUND(errors * 100.0 / total, 2) AS error_rate
        FROM events
        WHERE _event_type = 'checkout.completed'
          AND _timestamp > now() - INTERVAL 7 DAY
        GROUP BY new_checkout
    `,

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT FAILURES BY DECLINE CODE
    // ═══════════════════════════════════════════════════════════════
    // Your example: SELECT error.code, COUNT(*) as count ...
    paymentFailuresByCode: `
        SELECT 
            event.error.code AS error_code,
            COUNT(*) AS count
        FROM events 
        WHERE event.error.type = 'PaymentError'
          AND _timestamp > now() - INTERVAL 24 HOUR
        GROUP BY error_code 
        ORDER BY count DESC
    `,

    // ═══════════════════════════════════════════════════════════════
    // FIND USER'S RECENT REQUESTS
    // ═══════════════════════════════════════════════════════════════
    // Your example: SELECT ... FROM events WHERE user_id = 'user_456'
    userRecentRequests: `
        SELECT 
            _timestamp,
            event.path,
            event.status_code,
            event.duration_ms,
            event.error.code
        FROM events 
        WHERE event.user_id = 'user_456'
        ORDER BY _timestamp DESC 
        LIMIT 20
    `,

    // ═══════════════════════════════════════════════════════════════
    // TRACE CORRELATION - Find all events in a trace
    // ═══════════════════════════════════════════════════════════════
    traceCorrelation: `
        SELECT 
            _timestamp,
            event.service,
            event.span_id,
            event.path,
            event.status_code,
            event.duration_ms
        FROM events 
        WHERE event.trace_id = 'abc123def456'
        ORDER BY _timestamp ASC
    `,

    // ═══════════════════════════════════════════════════════════════
    // AGGREGATIONS ON ANY NESTED FIELD
    // ═══════════════════════════════════════════════════════════════
    cartValueAnalysis: `
        SELECT 
            event.subscription AS tier,
            AVG(event.cart.total_cents) AS avg_cart_value,
            MAX(event.cart.total_cents) AS max_cart_value,
            COUNT(*) AS orders
        FROM events
        WHERE _event_type = 'checkout.completed'
          AND event.status_code = 200
        GROUP BY tier
        ORDER BY avg_cart_value DESC
    `,

    // ═══════════════════════════════════════════════════════════════
    // LATENCY PERCENTILES BY ENDPOINT
    // ═══════════════════════════════════════════════════════════════
    latencyPercentiles: `
        SELECT 
            event.path,
            quantile(0.50)(event.duration_ms) AS p50,
            quantile(0.95)(event.duration_ms) AS p95,
            quantile(0.99)(event.duration_ms) AS p99,
            COUNT(*) AS requests
        FROM events
        WHERE _timestamp > now() - INTERVAL 1 HOUR
        GROUP BY event.path
        ORDER BY p99 DESC
        LIMIT 20
    `,
};

/**
 * KEY INSIGHT:
 * 
 * With ClickHouse JSON columns, the user's event structure
 * becomes the query interface. There's no "schema migration"
 * when they add a new field - it just works.
 * 
 * User sends:
 *   { "custom_field": "value", "nested": { "deep": 123 } }
 * 
 * They can immediately query:
 *   WHERE event.custom_field = 'value'
 *   WHERE event.nested.deep > 100
 *   GROUP BY event.custom_field
 * 
 * THIS is true high dimensionality support.
 */

