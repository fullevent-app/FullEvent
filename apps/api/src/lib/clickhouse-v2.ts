/**
 * ClickHouse V2 - TRUE Wide Events Implementation
 * 
 * Uses ClickHouse JSON column type for automatic schema inference.
 * User properties become queryable columns without transformation.
 */
import 'dotenv/config'
import { createClient } from '@clickhouse/client'
import { SCHEMA_V2_DDL, SCHEMA_V2_OBJECT_DDL, prepareWideEvent, type WideEventInsert } from './schema-v2.js'

export const clickhouse = createClient({
    url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DB || 'default',
    request_timeout: 30_000,
})

/**
 * Initialize the wide events schema
 */
export async function ensureSchemaV2() {
    try {
        await clickhouse.command({ query: SCHEMA_V2_DDL })
        console.log('✅ Wide events schema initialized (JSON column)')
    } catch (err) {
        // Fallback to Object type if JSON column not supported
        console.warn('⚠️ JSON column failed, trying Object type fallback:', err)
        await clickhouse.command({ query: SCHEMA_V2_OBJECT_DDL })
        console.log('✅ Wide events schema initialized (Object fallback)')
    }
}

/**
 * Ingest a wide event
 * 
 * The user's event properties become directly queryable columns.
 * No transformation needed - ClickHouse handles it.
 */
export async function ingestWideEvent(
    projectId: string,
    eventType: string,
    userEvent: Record<string, unknown>
) {
    const prepared = prepareWideEvent(projectId, eventType, userEvent)
    
    await clickhouse.insert({
        table: 'events',
        values: [prepared],
        format: 'JSONEachRow',
    })
}

/**
 * Batch ingest multiple wide events
 */
export async function ingestWideEventsBatch(
    events: Array<{
        projectId: string
        eventType: string
        event: Record<string, unknown>
    }>
) {
    const prepared = events.map(e => prepareWideEvent(e.projectId, e.eventType, e.event))
    
    await clickhouse.insert({
        table: 'events',
        values: prepared,
        format: 'JSONEachRow',
    })
}

// ═══════════════════════════════════════════════════════════════
// QUERY BUILDER - Direct column access on user properties
// ═══════════════════════════════════════════════════════════════

export interface QueryOptions {
    projectId: string
    startTime?: Date
    endTime?: Date
    eventType?: string
    limit?: number
    offset?: number
}

export interface FilterCondition {
    field: string      // e.g., "user_id", "subscription", "error.code"
    op: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN'
    value: string | number | string[] | number[]
}

/**
 * Build a WHERE clause for user event fields
 * 
 * Fields are accessed directly as event.field_name
 * Nested fields: event.error.code, event.cart.total
 */
function buildFieldAccess(field: string): string {
    // System fields don't need event. prefix
    if (field.startsWith('_')) {
        return field
    }
    return `event.${field}`
}

function escapeValue(value: string | number): string {
    if (typeof value === 'number') {
        return value.toString()
    }
    return `'${value.replace(/'/g, "\\'")}'`
}

export function buildWhereClause(
    options: QueryOptions,
    filters: FilterCondition[] = []
): string {
    const conditions: string[] = []
    
    // System filters
    conditions.push(`_project_id = ${escapeValue(options.projectId)}`)
    
    if (options.startTime) {
        conditions.push(`_timestamp >= toDateTime64('${options.startTime.toISOString()}', 3)`)
    }
    if (options.endTime) {
        conditions.push(`_timestamp <= toDateTime64('${options.endTime.toISOString()}', 3)`)
    }
    if (options.eventType) {
        conditions.push(`_event_type = ${escapeValue(options.eventType)}`)
    }
    
    // User-defined field filters - direct column access!
    for (const filter of filters) {
        const fieldAccess = buildFieldAccess(filter.field)
        
        if (filter.op === 'IN' && Array.isArray(filter.value)) {
            const values = filter.value.map(v => escapeValue(v)).join(', ')
            conditions.push(`${fieldAccess} IN (${values})`)
        } else if (filter.op === 'LIKE') {
            conditions.push(`${fieldAccess} LIKE ${escapeValue(filter.value as string)}`)
        } else {
            conditions.push(`${fieldAccess} ${filter.op} ${escapeValue(filter.value as string | number)}`)
        }
    }
    
    return conditions.join(' AND ')
}

/**
 * Query events with filters on any user-defined field
 * 
 * Example:
 *   queryEvents({ projectId: 'xxx' }, [
 *     { field: 'subscription', op: '=', value: 'premium' },
 *     { field: 'status_code', op: '>=', value: 500 },
 *     { field: 'error.code', op: '=', value: 'PAYMENT_FAILED' }
 *   ])
 */
export async function queryEvents(
    options: QueryOptions,
    filters: FilterCondition[] = []
) {
    const where = buildWhereClause(options, filters)
    const limit = options.limit || 100
    const offset = options.offset || 0
    
    const query = `
        SELECT 
            _id,
            _timestamp,
            _event_type,
            event
        FROM events
        WHERE ${where}
        ORDER BY _timestamp DESC
        LIMIT ${limit}
        OFFSET ${offset}
    `
    
    const result = await clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    
    return result.json()
}

/**
 * Aggregate events by any user-defined field
 * 
 * Example:
 *   aggregateByField('subscription', { projectId: 'xxx' }, [
 *     { field: 'status_code', op: '>=', value: 500 }
 *   ])
 * 
 * Returns: [{ subscription: 'premium', count: 150, error_count: 5 }, ...]
 */
export async function aggregateByField(
    groupByField: string,
    options: QueryOptions,
    filters: FilterCondition[] = []
) {
    const where = buildWhereClause(options, filters)
    const fieldAccess = buildFieldAccess(groupByField)
    
    const query = `
        SELECT 
            ${fieldAccess} AS ${groupByField.replace('.', '_')},
            COUNT(*) AS total,
            SUM(CASE WHEN event.status_code >= 500 THEN 1 ELSE 0 END) AS errors,
            ROUND(errors * 100.0 / total, 2) AS error_rate,
            AVG(event.duration_ms) AS avg_duration_ms,
            quantile(0.95)(event.duration_ms) AS p95_duration_ms
        FROM events
        WHERE ${where}
        GROUP BY ${fieldAccess}
        ORDER BY total DESC
        LIMIT 100
    `
    
    const result = await clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    
    return result.json()
}

/**
 * Search events with full-text search on any field
 * 
 * Since all fields are columns, we can use hasToken/match for fast search
 */
export async function searchEvents(
    searchTerm: string,
    searchFields: string[],
    options: QueryOptions,
    filters: FilterCondition[] = []
) {
    const baseWhere = buildWhereClause(options, filters)
    
    // Build OR clause for searching across multiple fields
    const searchConditions = searchFields
        .map(field => `toString(${buildFieldAccess(field)}) LIKE '%${searchTerm.replace(/'/g, "\\'")}%'`)
        .join(' OR ')
    
    const query = `
        SELECT 
            _id,
            _timestamp,
            _event_type,
            event
        FROM events
        WHERE ${baseWhere}
          AND (${searchConditions})
        ORDER BY _timestamp DESC
        LIMIT ${options.limit || 100}
    `
    
    const result = await clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    
    return result.json()
}

/**
 * Get latency percentiles grouped by any field
 */
export async function getLatencyPercentiles(
    groupByField: string,
    options: QueryOptions,
    filters: FilterCondition[] = []
) {
    const where = buildWhereClause(options, filters)
    const fieldAccess = buildFieldAccess(groupByField)
    
    const query = `
        SELECT 
            ${fieldAccess} AS ${groupByField.replace('.', '_')},
            quantile(0.50)(event.duration_ms) AS p50,
            quantile(0.90)(event.duration_ms) AS p90,
            quantile(0.95)(event.duration_ms) AS p95,
            quantile(0.99)(event.duration_ms) AS p99,
            COUNT(*) AS count
        FROM events
        WHERE ${where}
          AND event.duration_ms IS NOT NULL
        GROUP BY ${fieldAccess}
        ORDER BY p99 DESC
        LIMIT 50
    `
    
    const result = await clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    
    return result.json()
}

/**
 * Trace correlation - find all events with same trace_id
 */
export async function getTrace(traceId: string, projectId: string) {
    const query = `
        SELECT 
            _id,
            _timestamp,
            _event_type,
            event
        FROM events
        WHERE _project_id = '${projectId}'
          AND event.trace_id = '${traceId}'
        ORDER BY _timestamp ASC
    `
    
    const result = await clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    
    return result.json()
}

/**
 * Error analysis - group errors by any field
 */
export async function analyzeErrors(
    groupByField: string,
    options: QueryOptions
) {
    const where = buildWhereClause(options, [
        { field: 'status_code', op: '>=', value: 500 }
    ])
    const fieldAccess = buildFieldAccess(groupByField)
    
    const query = `
        SELECT 
            ${fieldAccess} AS ${groupByField.replace('.', '_')},
            event.error.type AS error_type,
            event.error.code AS error_code,
            COUNT(*) AS count
        FROM events
        WHERE ${where}
        GROUP BY ${fieldAccess}, error_type, error_code
        ORDER BY count DESC
        LIMIT 100
    `
    
    const result = await clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    
    return result.json()
}
