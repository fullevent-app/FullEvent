"use server";

import { db } from "@/lib/db";
import { project, apikey } from "@/lib/auth-schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { fullEvent } from "@/lib/fullevent";
import { stackServerApp } from "@/stack/server";
import { clickhouse } from "@/lib/clickhouse";
import { getUserLimits, getUserTier, PolarMetadata } from "@/lib/subscription";

// Helper to get current user from Stack Auth
async function getCurrentUser() {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
        throw new Error("Unauthorized");
    }
    return stackUser;
}

export async function createProject(name: string, traceId?: string) {
    const stackUser = await getCurrentUser();
    const userId = stackUser.id;

    // Check project limit based on subscription tier
    const limits = (stackUser.serverMetadata as { limits?: { maxProjects?: number } })?.limits;
    const maxProjects = limits?.maxProjects ?? 1; // Default to 1 for free tier

    const existingProjects = await db.select().from(project).where(
        and(
            eq(project.userId, userId),
            isNull(project.deletedAt)
        )
    );
    if (existingProjects.length >= maxProjects) {
        return {
            error: `Project limit reached. Your plan allows ${maxProjects} project${maxProjects === 1 ? '' : 's'}. Upgrade to create more.`,
            limitReached: true
        };
    }

    const projectId = crypto.randomUUID();

    await db.insert(project).values({
        id: projectId,
        name,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await fullEvent.ingest("project_created", {
        projectId,
        projectName: name,
        userId: userId,
        trace_id: traceId
    });

    return { id: projectId };
}

export async function getMonthlyEventCount() {
    const stackUser = await getCurrentUser();
    const userId = stackUser.id;
    const metadata = stackUser.serverMetadata as { polar?: PolarMetadata };

    // Fetch projects from Turso first
    const userProjects = await db.select({ id: project.id }).from(project).where(eq(project.userId, userId));
    const projectIds = userProjects.map(p => p.id);

    if (projectIds.length === 0) {
        return 0;
    }

    let startPeriod = new Date();
    startPeriod.setDate(1);
    startPeriod.setHours(0, 0, 0, 0);

    // Use actual billing period start if available
    if (metadata?.polar?.currentPeriodStart) {
        startPeriod = new Date(metadata.polar.currentPeriodStart);
        startPeriod.setHours(0, 0, 0, 0);
    }

    const startPeriodStr = startPeriod.toISOString().split('T')[0];

    const result = await clickhouse.query({
        query: `
            SELECT sum(count) as count 
            FROM daily_usage_v2 
            WHERE project_id IN ({projectIds:Array(String)})
            AND day >= {startPeriod:Date}
        `,
        query_params: {
            projectIds,
            startPeriod: startPeriodStr
        },
        format: 'JSONEachRow'
    });

    const rows = await result.json() as { count: string }[];
    return parseInt(rows[0]?.count || '0', 10);
}

export async function getSubscriptionDetails() {
    const stackUser = await getCurrentUser();
    const [tier, limits, eventCount, projects] = await Promise.all([
        getUserTier(stackUser.id),
        getUserLimits(stackUser.id),
        getMonthlyEventCount(),
        db.select().from(project).where(
            and(
                eq(project.userId, stackUser.id),
                isNull(project.deletedAt)
            )
        )
    ]);

    return {
        tier,
        limits,
        eventCount,
        projectCount: projects.length
    };
}

export async function getProjects() {
    const stackUser = await getCurrentUser();
    return db.select().from(project).where(
        and(
            eq(project.userId, stackUser.id),
            isNull(project.deletedAt)
        )
    );
}

export async function getProject(projectId: string) {
    const stackUser = await getCurrentUser();
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id),
            isNull(project.deletedAt)
        )
    );
    return p;
}

/**
 * Consolidated init function for the logs page.
 * Fetches all required data in a single server action to minimize network requests.
 */
export async function initLogsPage(projectId: string, options?: {
    limit?: number;
    offset?: number;
}) {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const stackUser = await getCurrentUser();

    // Verify user owns the project and get project details
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id),
            isNull(project.deletedAt)
        )
    );

    if (!p) {
        return { error: "Project not found or unauthorized" };
    }

    // Fetch everything else in parallel
    const [events, stats, suggestions] = await Promise.all([
        // Events query (simplified from getProjectEvents)
        clickhouse.query({
            query: `
                SELECT _id as id, _project_id as projectId, _event_type as type, 
                       toString(event) as payload, _timestamp as timestamp,
                       event.status_code as statusCode, event.outcome as outcome
                FROM events
                WHERE _project_id = {projectId:String}
                ORDER BY _timestamp DESC
                LIMIT {limit:UInt32}
                OFFSET {offset:UInt32}
            `,
            query_params: { projectId, limit, offset },
            format: 'JSONEachRow'
        }).then(r => r.json() as Promise<Array<{
            id: string;
            projectId: string;
            type: string;
            payload: string;
            timestamp: string;
            statusCode?: number | null;
            outcome?: string | null;
        }>>).then(rows => rows.map(e => ({
            ...e,
            timestamp: new Date(e.timestamp)
        }))),

        // Stats query (simplified from getProjectStats)
        clickhouse.query({
            query: `
                SELECT 
                    count() as total_events,
                    countIf(event.status_code >= 500 OR event.outcome = 'error') as error_count,
                    countIf(event.status_code >= 200 AND event.status_code < 400) as success_count,
                    avg(CAST(event.duration_ms, 'Nullable(Float64)')) as avg_duration
                FROM events
                WHERE _project_id = {projectId:String}
                AND _timestamp >= now() - INTERVAL 24 HOUR
            `,
            query_params: { projectId },
            format: 'JSONEachRow'
        }).then(r => r.json() as Promise<Array<{
            total_events: string;
            error_count: string;
            success_count: string;
            avg_duration: string | null;
        }>>).then(rows => {
            const row = rows[0];
            const total = parseInt(row?.total_events) || 0;
            const errors = parseInt(row?.error_count) || 0;
            const success = parseInt(row?.success_count) || 0;
            return {
                total,
                errors,
                errorRate: total > 0 ? (errors / total) * 100 : 0,
                successRate: total > 0 ? (success / total) * 100 : 0
            };
        }),

        // Search suggestions - full dynamic field discovery by parsing payloads
        clickhouse.query({
            query: `
                SELECT _event_type as type, event.status_code as statusCode, 
                       event.outcome as outcome, toString(event) as payload
                FROM events
                WHERE _project_id = {projectId:String}
                ORDER BY _timestamp DESC
                LIMIT 500
            `,
            query_params: { projectId },
            format: 'JSONEachRow'
        }).then(r => r.json() as Promise<Array<{
            type: string;
            statusCode: number | null;
            outcome: string | null;
            payload: string;
        }>>).then(recentEvents => {
            // Dynamic field discovery: key -> Set of values
            const fieldValues: Record<string, Set<string>> = {};
            const eventTypes = new Set<string>();

            // Helper to add a value to a field
            const addFieldValue = (key: string, value: unknown) => {
                if (value === null || value === undefined) return;
                if (typeof value === 'object') return;
                const strValue = String(value);
                if (strValue.length > 50) return; // Skip long values
                if (!fieldValues[key]) fieldValues[key] = new Set();
                fieldValues[key].add(strValue);
            };

            recentEvents.forEach(event => {
                if (event.type) eventTypes.add(event.type);
                if (event.statusCode) addFieldValue('status_code', event.statusCode);
                if (event.outcome) addFieldValue('outcome', event.outcome);

                // Parse JSON payload to discover ALL nested keys
                try {
                    const parsed = JSON.parse(event.payload);
                    const processValue = (prefix: string, value: unknown) => {
                        if (value === null || value === undefined) return;
                        if (typeof value === 'object' && !Array.isArray(value)) {
                            Object.entries(value).forEach(([k, v]) => {
                                processValue(prefix ? `${prefix}.${k}` : k, v);
                            });
                        } else {
                            addFieldValue(prefix, value);
                        }
                    };
                    Object.entries(parsed || {}).forEach(([key, value]) => {
                        processValue(key, value);
                    });
                } catch { /* Ignore parse errors */ }
            });

            // Convert Sets to arrays
            const fields: Record<string, string[]> = {};
            Object.entries(fieldValues).forEach(([key, valueSet]) => {
                const values = Array.from(valueSet);
                const numericValues = values.filter(v => !isNaN(Number(v))).sort((a, b) => Number(a) - Number(b));
                const stringValues = values.filter(v => isNaN(Number(v))).sort();
                fields[key] = [...numericValues, ...stringValues].slice(0, 25);
            });

            return {
                eventTypes: Array.from(eventTypes).slice(0, 30),
                fields
            };
        }).catch(() => ({ eventTypes: [], fields: {} }))
    ]);

    // Fire trackLogsView in background (don't await)
    fullEvent.ingest("logs.view", {
        projectId,
        userId: stackUser.id
    }).catch(() => { });

    return {
        project: p,
        events,
        stats,
        suggestions,
        hasMore: events.length >= limit
    };
}

export async function createProjectKey(projectId: string, traceId?: string) {
    const stackUser = await getCurrentUser();

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Generate API key manually (since we removed better-auth's apiKey plugin)
    const keyId = crypto.randomUUID();
    const keyValue = `fe_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyHash = await hashApiKey(keyValue);

    await db.insert(apikey).values({
        id: keyId,
        name: `${p.name} Key`,
        start: keyValue.substring(0, 8),
        prefix: "fe",
        key: keyHash,
        userId: stackUser.id,
        enabled: true,
        rateLimitEnabled: false,
        requestCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: JSON.stringify({ projectId }),
    });

    await fullEvent.ingest("api_key_created", {
        projectId,
        projectName: p.name,
        userId: stackUser.id,
        trace_id: traceId
    });

    return { id: keyId, key: keyValue };
}

export async function deleteProject(projectId: string, confirmationName: string) {
    const stackUser = await getCurrentUser();

    // Verify ownership
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    if (p.name !== confirmationName) {
        throw new Error("Project name does not match");
    }

    // Invalidate API keys associated with the project
    const userKeys = await db.select({ id: apikey.id, metadata: apikey.metadata }).from(apikey).where(
        eq(apikey.userId, stackUser.id)
    );

    const projectKeyIds = userKeys
        .filter(k => {
            try {
                const meta = k.metadata ? JSON.parse(k.metadata) : {};
                return meta.projectId === projectId;
            } catch { return false; }
        })
        .map(k => k.id);

    if (projectKeyIds.length > 0) {
        await db.update(apikey)
            .set({ enabled: false, updatedAt: new Date() })
            .where(inArray(apikey.id, projectKeyIds));
    }

    // Soft delete
    await db.update(project)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(project.id, projectId));

    await fullEvent.ingest("project_deleted", {
        projectId,
        userId: stackUser.id,
        projectName: p.name,
        scheduledDeletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invalidatedKeysCount: projectKeyIds.length
    });

    return { success: true };
}

// Simple hash function for API keys
async function hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getProjectEvents(
    projectId: string,
    options?: {
        search?: string;
        limit?: number;
        [key: string]: string | number | undefined;
    }
) {
    const stackUser = await getCurrentUser();

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    const queryParams: Record<string, string | number> = { projectId };
    let whereClause = "_project_id = {projectId:String}";

    if (options?.search) {
        // V2: Search in the JSON event column using toString for full-text search
        whereClause += " AND toString(event) ILIKE {search:String}";
        queryParams.search = `%${options.search}%`;
    }

    const specialKeys = ['search', 'limit', 'offset'];

    Object.entries(options || {}).forEach(([key, value]) => {
        if (specialKeys.includes(key) || value === undefined || value === '') return;

        if (key === 'status') {
            const statusVal = String(value);
            if (statusVal === "error") {
                // V2: Access JSON columns directly with event.field syntax
                whereClause += " AND (event.status_code >= 400 OR event.outcome = 'error')";
            } else if (statusVal === "success") {
                whereClause += " AND ((event.status_code >= 200 AND event.status_code < 400) OR event.outcome = 'success')";
            } else {
                const numVal = parseInt(statusVal, 10);
                if (!isNaN(numVal)) {
                    whereClause += ` AND event.status_code = ${numVal}`;
                } else {
                    whereClause += ` AND toString(event.status_code) ILIKE '%${statusVal}%'`;
                }
            }
            return;
        }

        if (key === 'status_code') {
            const statusVal = String(value);
            const numVal = parseInt(statusVal, 10);
            if (!isNaN(numVal)) {
                whereClause += ` AND event.status_code = ${numVal}`;
            } else {
                whereClause += ` AND toString(event.status_code) ILIKE '%${statusVal}%'`;
            }
            return;
        }

        if (key === 'outcome') {
            const outcomeVal = String(value);
            whereClause += ` AND event.outcome = '${outcomeVal}'`;
            return;
        }

        if (key === 'type') {
            whereClause += " AND _event_type = {type:String}";
            queryParams.type = String(value);
            return;
        }

        // V2: Generic filter using dot notation on JSON column
        if (!/^[a-zA-Z0-9_.]+$/.test(key)) return;
        const paramKey = key.replace(/\./g, '_');
        // Access nested JSON fields directly: event.field.subfield
        whereClause += ` AND toString(event.${key}) ILIKE {${paramKey}:String}`;
        queryParams[paramKey] = `%${String(value)}%`;
    });

    const limit = Number(options?.limit) || 100;
    const offset = Number(options?.offset) || 0;

    const query = `
        SELECT 
            _id as id, 
            _project_id as projectId,
            _event_type as type, 
            toString(event) as payload, 
            _timestamp as timestamp, 
            event.status_code as statusCode, 
            event.outcome as outcome 
        FROM events
        WHERE ${whereClause}
        ORDER BY _timestamp DESC
        LIMIT {limit:Int32} OFFSET {offset:Int32}
    `;

    queryParams.limit = limit;
    queryParams.offset = offset;

    const result = await clickhouse.query({
        query,
        query_params: queryParams,
        format: 'JSONEachRow'
    });

    const rows = await result.json() as {
        id: string;
        projectId: string;
        type: string;
        payload: string;
        timestamp: string;
        statusCode: number | null;
        outcome: string | null;
    }[];

    return rows.map(row => ({
        ...row,
        timestamp: new Date(row.timestamp)
    }));
}


export async function getProjectKeys(projectId: string) {
    const stackUser = await getCurrentUser();

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Fetch keys for the project from our apikey table
    const keys = await db.select({
        id: apikey.id,
        name: apikey.name,
        start: apikey.start,
        createdAt: apikey.createdAt,
        metadata: apikey.metadata,
    }).from(apikey).where(
        and(
            eq(apikey.userId, stackUser.id),
            eq(apikey.enabled, true)
        )
    );

    // Filter by projectId in metadata
    return keys.filter(k => {
        try {
            const meta = k.metadata ? JSON.parse(k.metadata) : null;
            return meta?.projectId === projectId;
        } catch {
            return false;
        }
    });
}

export async function revokeProjectKey(keyId: string, projectId: string, traceId?: string) {
    const stackUser = await getCurrentUser();

    const currentKeys = await getProjectKeys(projectId);

    if (currentKeys.length <= 1) {
        throw new Error("Cannot revoke the last API key. Create a new one first.");
    }

    // Soft delete by disabling the key
    await db.update(apikey)
        .set({ enabled: false, updatedAt: new Date() })
        .where(
            and(
                eq(apikey.id, keyId),
                eq(apikey.userId, stackUser.id)
            )
        );

    await fullEvent.ingest("api_key_revoked", {
        projectId,
        userId: stackUser.id,
        keyId,
        trace_id: traceId
    });

    return { success: true };
}

export async function trackLogsView(projectId: string, traceId?: string) {
    const stackUser = await getCurrentUser();

    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (p) {
        await fullEvent.ingest("logs_viewed", {
            projectId,
            projectName: p.name,
            userId: stackUser.id,
            trace_id: traceId
        });
    }
}

/**
 * Get distinct field values from the user's logs for dynamic search suggestions.
 * Extracts ALL keys from ingested_properties - no predefined limits.
 * Returns actual data from their logs, not hardcoded guesses.
 */
export async function getProjectSearchSuggestions(projectId: string) {
    const stackUser = await getCurrentUser();

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Get recent events from ClickHouse (V2 schema)
    const result = await clickhouse.query({
        query: `
            SELECT _event_type as type, event.status_code as statusCode, event.outcome as outcome, toString(event) as payload
            FROM events
            WHERE _project_id = {projectId:String}
            ORDER BY _timestamp DESC
            LIMIT 500
        `,
        query_params: { projectId },
        format: 'JSONEachRow'
    });

    const recentEvents = await result.json() as {
        type: string;
        statusCode: number | null;
        outcome: string | null;
        payload: string;
    }[];

    // Dynamic field discovery: key -> Set of values
    const fieldValues: Record<string, Set<string>> = {};
    const eventTypes = new Set<string>();

    // Helper to add a value to a field
    const addFieldValue = (key: string, value: unknown) => {
        if (value === null || value === undefined) return;

        // Only suggest string/number/boolean values (not objects/arrays)
        if (typeof value === 'object') return;

        const strValue = String(value);
        // Skip very long values (not useful for filtering)
        if (strValue.length > 50) return;

        if (!fieldValues[key]) {
            fieldValues[key] = new Set();
        }
        fieldValues[key].add(strValue);
    };

    recentEvents.forEach(event => {
        // Event type (first-class)
        if (event.type) eventTypes.add(event.type);

        // First-class columns
        if (event.statusCode) addFieldValue('status_code', event.statusCode);
        if (event.outcome) addFieldValue('outcome', event.outcome);

        // Extract ALL keys from ingested_properties
        try {
            const parsed = JSON.parse(event.payload);
            const props = parsed || {};

            // Start recursion
            const processValue = (prefix: string, value: unknown) => {
                if (value === null || value === undefined) return;

                if (typeof value === 'object' && !Array.isArray(value)) {
                    Object.entries(value).forEach(([k, v]) => {
                        processValue(prefix ? `${prefix}.${k}` : k, v);
                    });
                } else {
                    addFieldValue(prefix, value);
                }
            };

            Object.entries(props).forEach(([key, value]) => {
                processValue(key, value);
            });
        } catch {
            // Ignore parse errors
        }
    });

    // Add synthetic status categories if we have status codes
    if (fieldValues['status_code']?.size > 0) {
        const codes = Array.from(fieldValues['status_code']);
        const hasErrors = codes.some(code => parseInt(code) >= 400);
        const hasSuccess = codes.some(code => parseInt(code) >= 200 && parseInt(code) < 400);

        if (hasErrors) fieldValues['status_code'].add('error');
        if (hasSuccess) fieldValues['status_code'].add('success');
    }

    // Convert Sets to arrays and limit values per field
    const fields: Record<string, string[]> = {};
    Object.entries(fieldValues).forEach(([key, valueSet]) => {
        // Sort values: numbers first (sorted), then strings (sorted)
        const values = Array.from(valueSet);
        const numericValues = values.filter(v => !isNaN(Number(v))).sort((a, b) => Number(a) - Number(b));
        const stringValues = values.filter(v => isNaN(Number(v))).sort();

        fields[key] = [...numericValues, ...stringValues].slice(0, 25);
    });

    return {
        eventTypes: Array.from(eventTypes).slice(0, 30),
        fields,
    };
}

/**
 * Get aggregate statistics for ALL events in a project.
 * Returns counts without pagination - total across all data.
 * Supports the same filter options as getProjectEvents.
 */
export async function getProjectStats(
    projectId: string,
    options?: {
        search?: string;
        [key: string]: string | number | undefined;
    }
) {
    const stackUser = await getCurrentUser();

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    const queryParams: Record<string, string | number> = { projectId };
    let whereClause = "_project_id = {projectId:String}";

    if (options?.search) {
        whereClause += " AND toString(event) ILIKE {search:String}";
        queryParams.search = `%${options.search}%`;
    }

    if (options) {
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'search' || key === 'limit' || key === 'offset' || value === undefined) return;
            if (key === 'status') {
                const statusVal = String(value);
                if (statusVal === "error") {
                    whereClause += " AND (event.status_code >= 400 OR event.outcome = 'error')";
                } else if (statusVal === "success") {
                    whereClause += " AND ((event.status_code >= 200 AND event.status_code < 400) OR event.outcome = 'success')";
                } else {
                    const numVal = parseInt(statusVal, 10);
                    if (!isNaN(numVal)) {
                        whereClause += ` AND event.status_code = ${numVal}`;
                    } else {
                        whereClause += ` AND toString(event.status_code) ILIKE '%${statusVal}%'`;
                    }
                }
                return;
            }

            if (key === 'outcome') {
                const outcomeVal = String(value);
                whereClause += ` AND event.outcome = '${outcomeVal}'`;
                return;
            }

            if (key === 'type') {
                whereClause += " AND _event_type = {type:String}";
                queryParams.type = String(value);
                return;
            }

            if (!/^[a-zA-Z0-9_.]+$/.test(key)) return;
            const paramKey = key.replace(/\./g, '_');
            whereClause += ` AND toString(event.${key}) ILIKE {${paramKey}:String}`;
            queryParams[paramKey] = `%${String(value)}%`;
        });
    }

    const countQuery = `
        SELECT count() as count 
        FROM events 
        WHERE ${whereClause}
    `;

    const [totalResult] = await Promise.all([
        clickhouse.query({
            query: countQuery,
            query_params: queryParams,
            format: 'JSONEachRow'
        })
    ]);

    const totalRows = await totalResult.json() as { count: string }[];
    const total = Number(totalRows[0]?.count || 0);

    // Error count query (V2 schema)
    const errorWhere = whereClause + " AND (event.status_code >= 400 OR event.outcome = 'error')";

    const errorResult = await clickhouse.query({
        query: `SELECT count() as count FROM events WHERE ${errorWhere}`,
        query_params: queryParams,
        format: 'JSONEachRow'
    });

    const errorRows = await errorResult.json() as { count: string }[];
    const errors = Number(errorRows[0]?.count || 0);

    return {
        total,
        errors,
        errorRate: total > 0 ? Math.round((errors / total) * 100) : 0,
        successRate: total > 0 ? Math.round(((total - errors) / total) * 100) : 0,
    };
}

/**
 * Get events that share the same trace_id as a given event.
 * Used to show related frontend/backend events in the log details panel.
 */
export async function getRelatedEventsByTraceId(
    projectId: string,
    eventId: string,
    traceId: string
): Promise<{
    id: string;
    type: string;
    timestamp: Date;
    payload: string;
    statusCode?: number | null;
    outcome?: string | null;
}[]> {
    const startTotal = performance.now();

    // Run auth and project lookup in parallel
    const startParallel = performance.now();
    const [stackUser, projectResult] = await Promise.all([
        getCurrentUser(),
        db.select().from(project).where(eq(project.id, projectId))
    ]);
    console.log(`[TIMING] parallel (auth + project lookup): ${(performance.now() - startParallel).toFixed(0)}ms`);

    const [p] = projectResult;

    // Verify user owns the project
    if (!p || p.userId !== stackUser.id) {
        throw new Error("Project not found or unauthorized");
    }

    // Search for events with same trace_id in the event JSON (V2 schema)
    const startClickhouse = performance.now();
    const result = await clickhouse.query({
        query: `
            SELECT _id as id, _event_type as type, _timestamp as timestamp, toString(event) as payload, event.status_code as statusCode, event.outcome as outcome
            FROM events
            WHERE _project_id = {projectId:String}
            AND (
                event.trace_id = {traceId:String} 
                OR event.request_id = {traceId:String}
            )
            ORDER BY _timestamp DESC
            LIMIT 20
        `,
        query_params: {
            projectId,
            traceId
        },
        format: 'JSONEachRow'
    });
    console.log(`[TIMING] clickhouse.query: ${(performance.now() - startClickhouse).toFixed(0)}ms`);

    const relatedEvents = await result.json() as {
        id: string;
        type: string;
        timestamp: string;
        payload: string;
        statusCode: number | null;
        outcome: string | null;
    }[];

    console.log(`[TIMING] TOTAL getRelatedEventsByTraceId: ${(performance.now() - startTotal).toFixed(0)}ms`);

    // Filter out the current event
    return relatedEvents
        .filter(e => e.id !== eventId)
        .map(e => ({
            ...e,
            timestamp: new Date(e.timestamp)
        }));
}

/**
 * Mark the current user's onboarding as complete.
 * Uses Stack Auth's clientReadOnlyMetadata to prevent bypass via API.
 */
export async function completeOnboarding() {
    const stackUser = await getCurrentUser();

    // Update Stack Auth metadata (server-side to prevent bypass)
    await stackUser.update({
        clientReadOnlyMetadata: {
            ...stackUser.clientReadOnlyMetadata,
            onboarded: true,
        },
        serverMetadata: {
            ...stackUser.serverMetadata,
            onboarded: true,
        },
    });

    await fullEvent.ingest("onboarding_completed", {
        userId: stackUser.id,
    });

    return { success: true };
}

/**
 * Create a project and auto-generate the first API key.
 * Used during onboarding to combine both steps.
 */
export async function createProjectWithKey(name: string, traceId?: string) {
    const stackUser = await getCurrentUser();

    const projectId = crypto.randomUUID();

    await db.insert(project).values({
        id: projectId,
        name,
        userId: stackUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Auto-generate the first API key
    const keyId = crypto.randomUUID();
    const keyValue = `fe_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyHash = await hashApiKey(keyValue);

    await db.insert(apikey).values({
        id: keyId,
        name: `${name} Key`,
        start: keyValue.substring(0, 8),
        prefix: "fe",
        key: keyHash,
        userId: stackUser.id,
        enabled: true,
        rateLimitEnabled: false,
        requestCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: JSON.stringify({ projectId }),
    });

    await fullEvent.ingest("project_created_onboarding", {
        projectId,
        projectName: name,
        userId: stackUser.id,
        trace_id: traceId
    });

    return {
        projectId,
        projectName: name,
        apiKey: keyValue,
        keyId: keyId,
    };
}

/**
 * Check if any events have been received for a project.
 * Used during onboarding to verify SDK integration.
 */
export async function checkForTestEvent(projectId: string) {
    const stackUser = await getCurrentUser();

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, stackUser.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Check for ping events in this project (V2 schema)
    const result = await clickhouse.query({
        query: `
            SELECT _id as id, _event_type as type, toString(event) as payload, _timestamp as timestamp
            FROM events
            WHERE _project_id = {projectId:String}
            AND _event_type = 'fullevent.ping'
            ORDER BY _timestamp DESC
            LIMIT 1
        `,
        query_params: { projectId },
        format: 'JSONEachRow'
    });

    const rawEvents = await result.json() as {
        id: string;
        type: string;
        payload: string;
        timestamp: string;
    }[];

    const events = rawEvents.map(e => ({
        ...e,
        timestamp: new Date(e.timestamp)
    }));

    const hasEvents = events.length > 0;

    return {
        hasEvents,
        event: hasEvents ? events[0] : null,
        eventCount: events.length // Note: This will logically be 1 due to the limit, but sufficient for boolean check
    };
}
