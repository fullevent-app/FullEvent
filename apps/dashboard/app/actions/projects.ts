"use server";

import { db } from "@/lib/db";
import { project, eventLog, user } from "@/lib/auth-schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, like, desc, or, gte, lt, count } from "drizzle-orm";
import { fullEvent } from "@/lib/fullevent";

export async function createProject(name: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    const projectId = crypto.randomUUID();

    await db.insert(project).values({
        id: projectId,
        name,
        userId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await fullEvent.ingest("project_created", {
        projectId,
        projectName: name,
        userId: session.user.id,
    });

    return { id: projectId };
}

export async function getProjects() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    return db.select().from(project).where(eq(project.userId, session.user.id));
}

export async function createProjectKey(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    const result = await auth.api.createApiKey({
        body: {
            name: `${p.name} Key`,
            metadata: {
                projectId,
            },
        },
        headers: await headers()
    });

    await fullEvent.ingest("api_key_created", {
        projectId,
        projectName: p.name,
        userId: session.user.id,
    });

    return result;
}

export async function getProjectEvents(
    projectId: string,
    options?: {
        search?: string;
        limit?: number;
        [key: string]: string | number | undefined;
    }
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    const conditions = [eq(eventLog.projectId, projectId)];

    if (options?.search) {
        conditions.push(like(eventLog.payload, `%${options.search}%`));
    }

    const specialKeys = ['search', 'limit', 'offset'];

    Object.entries(options || {}).forEach(([key, value]) => {
        if (specialKeys.includes(key) || value === undefined || value === '') return;

        if (key === 'status') {
            const statusVal = String(value);
            if (statusVal === "error") {
                // Use first-class columns, fallback to JSON for backward compatibility
                const statusCondition = or(
                    gte(eventLog.statusCode, 400),
                    eq(eventLog.outcome, 'error'),
                    // Fallback for old events without extracted columns
                    like(eventLog.payload, `%"status_code":5%`),
                    like(eventLog.payload, `%"status_code":4%`)
                );
                if (statusCondition) conditions.push(statusCondition);
            } else if (statusVal === "success") {
                const statusCondition = or(
                    and(gte(eventLog.statusCode, 200), lt(eventLog.statusCode, 400)),
                    eq(eventLog.outcome, 'success'),
                    // Fallback for old events
                    like(eventLog.payload, `%"status_code":2%`)
                );
                if (statusCondition) conditions.push(statusCondition);
            } else {
                // Specific code - use column if possible
                const numVal = parseInt(statusVal, 10);
                if (!isNaN(numVal)) {
                    const orCondition = or(
                        eq(eventLog.statusCode, numVal),
                        like(eventLog.payload, `%"status_code":${statusVal}%`)
                    );
                    if (orCondition) conditions.push(orCondition);
                } else {
                    conditions.push(like(eventLog.payload, `%"status_code":${statusVal}%`));
                }
            }
            return;
        }

        // Handle outcome filter using first-class column
        if (key === 'outcome') {
            const outcomeVal = String(value);
            conditions.push(or(
                eq(eventLog.outcome, outcomeVal),
                like(eventLog.payload, `%"outcome":"${outcomeVal}"%`)
            )!);
            return;
        }

        // Handle type filter using the type column
        if (key === 'type') {
            conditions.push(eq(eventLog.type, String(value)));
            return;
        }

        // Generic JSON filter
        // We attempt to match "key":"value" pattern loosely
        // Values might be strings or numbers, so we don't strictly quote the value in the like clause
        // This matches `"method":"GET"` and `"duration_ms":123`
        conditions.push(like(eventLog.payload, `%"${key}":%${value}%`));
    });

    const limit = Number(options?.limit) || 100;
    const offset = Number(options?.offset) || 0;

    const results = await db.select().from(eventLog)
        .where(and(...conditions))
        .orderBy(desc(eventLog.timestamp))
        .limit(limit)
        .offset(offset);

    return results;
}


export async function getProjectKeys(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Fetch keys for the project
    // Note: BetterAuth doesn't expose a direct method to filter keys by metadata in the client
    // So we'll fetch all user keys and filter manually or use a direct DB query if we had access to the auth schema tables directly.
    // For now, let's assume `listApiKeys` returns keys we can filter.
    const keys = await auth.api.listApiKeys({
        headers: await headers(),
    });

    return keys.filter(k => k.metadata?.projectId === projectId);
}

export async function revokeProjectKey(keyId: string, projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    const currentKeys = await getProjectKeys(projectId);

    if (currentKeys.length <= 1) {
        throw new Error("Cannot revoke the last API key. Create a new one first.");
    }

    await auth.api.deleteApiKey({
        body: {
            keyId
        },
        headers: await headers()
    });

    await fullEvent.ingest("api_key_revoked", {
        projectId,
        userId: session.user.id,
        keyId
    });

    return { success: true };
}

export async function trackLogsView(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) return;

    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (p) {
        await fullEvent.ingest("logs_viewed", {
            projectId,
            projectName: p.name,
            userId: session.user.id,
        });
    }
}

/**
 * Get distinct field values from the user's logs for dynamic search suggestions.
 * Extracts ALL keys from ingested_properties - no predefined limits.
 * Returns actual data from their logs, not hardcoded guesses.
 */
export async function getProjectSearchSuggestions(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Get recent events to extract distinct values
    // Limit to last 500 events for performance
    const recentEvents = await db.select({
        type: eventLog.type,
        statusCode: eventLog.statusCode,
        outcome: eventLog.outcome,
        payload: eventLog.payload,
    }).from(eventLog)
        .where(eq(eventLog.projectId, projectId))
        .orderBy(desc(eventLog.timestamp))
        .limit(500);

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
            const props = parsed.ingested_properties || {};

            // Iterate over ALL keys in the user's properties
            Object.entries(props).forEach(([key, value]) => {
                addFieldValue(key, value);
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
        // Event types are special - they come from the type column
        eventTypes: Array.from(eventTypes).slice(0, 30),
        // All other fields discovered from ingested_properties
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
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    const conditions = [eq(eventLog.projectId, projectId)];

    // Apply same filters as getProjectEvents
    if (options?.search) {
        conditions.push(like(eventLog.payload, `%${options.search}%`));
    }

    // Process filter options (same logic as getProjectEvents)
    if (options) {
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'search' || key === 'limit' || key === 'offset' || value === undefined) return;

            if (key === 'status' || key === 'status_code') {
                const statusVal = String(value);
                if (statusVal === "error") {
                    const statusCondition = or(
                        gte(eventLog.statusCode, 400),
                        eq(eventLog.outcome, 'error'),
                        like(eventLog.payload, `%"status_code":5%`),
                        like(eventLog.payload, `%"status_code":4%`)
                    );
                    if (statusCondition) conditions.push(statusCondition);
                } else if (statusVal === "success") {
                    const statusCondition = or(
                        and(gte(eventLog.statusCode, 200), lt(eventLog.statusCode, 400)),
                        eq(eventLog.outcome, 'success'),
                        like(eventLog.payload, `%"status_code":2%`)
                    );
                    if (statusCondition) conditions.push(statusCondition);
                } else {
                    const numVal = parseInt(statusVal, 10);
                    if (!isNaN(numVal)) {
                        const orCondition = or(
                            eq(eventLog.statusCode, numVal),
                            like(eventLog.payload, `%"status_code":${statusVal}%`)
                        );
                        if (orCondition) conditions.push(orCondition);
                    } else {
                        conditions.push(like(eventLog.payload, `%"status_code":${statusVal}%`));
                    }
                }
                return;
            }

            if (key === 'outcome') {
                const outcomeVal = String(value);
                conditions.push(or(
                    eq(eventLog.outcome, outcomeVal),
                    like(eventLog.payload, `%"outcome":"${outcomeVal}"%`)
                )!);
                return;
            }

            if (key === 'type') {
                conditions.push(eq(eventLog.type, String(value)));
                return;
            }

            // Generic filter for any other key
            conditions.push(like(eventLog.payload, `%"${key}":"${value}"%`));
        });
    }

    // Get total count
    const [totalResult] = await db
        .select({ count: count() })
        .from(eventLog)
        .where(and(...conditions));

    // Get error count - check both DB columns AND JSON payload
    const errorConditions = [...conditions];
    const errorFilter = or(
        gte(eventLog.statusCode, 400),
        eq(eventLog.outcome, 'error'),
        // Also check JSON payload for legacy events
        like(eventLog.payload, `%"status_code":4%`),
        like(eventLog.payload, `%"status_code":5%`),
        like(eventLog.payload, `%"statusCode":4%`),
        like(eventLog.payload, `%"statusCode":5%`),
        like(eventLog.payload, `%"outcome":"error"%`)
    );
    if (errorFilter) errorConditions.push(errorFilter);

    const [errorResult] = await db
        .select({ count: count() })
        .from(eventLog)
        .where(and(...errorConditions));

    const total = totalResult?.count ?? 0;
    const errors = errorResult?.count ?? 0;

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
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Search for events with same trace_id in the payload
    // Search both trace_id and request_id fields
    const relatedEvents = await db
        .select({
            id: eventLog.id,
            type: eventLog.type,
            timestamp: eventLog.timestamp,
            payload: eventLog.payload,
            statusCode: eventLog.statusCode,
            outcome: eventLog.outcome,
        })
        .from(eventLog)
        .where(
            and(
                eq(eventLog.projectId, projectId),
                // Match events with same trace_id (in JSON payload)
                or(
                    like(eventLog.payload, `%"trace_id":"${traceId}"%`),
                    like(eventLog.payload, `%"request_id":"${traceId}"%`)
                )
            )
        )
        .orderBy(desc(eventLog.timestamp))
        .limit(20);

    // Filter out the current event
    return relatedEvents.filter(e => e.id !== eventId);
}

/**
 * Mark the current user's onboarding as complete.
 */
export async function completeOnboarding() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    await db.update(user)
        .set({ onboardingCompleted: true })
        .where(eq(user.id, session.user.id));

    await fullEvent.ingest("onboarding_completed", {
        userId: session.user.id,
    });

    return { success: true };
}

/**
 * Create a project and auto-generate the first API key.
 * Used during onboarding to combine both steps.
 */
export async function createProjectWithKey(name: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    const projectId = crypto.randomUUID();

    await db.insert(project).values({
        id: projectId,
        name,
        userId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Auto-generate the first API key
    const keyResult = await auth.api.createApiKey({
        body: {
            name: `${name} Key`,
            metadata: {
                projectId,
            },
        },
        headers: await headers()
    });

    await fullEvent.ingest("project_created_onboarding", {
        projectId,
        projectName: name,
        userId: session.user.id,
    });

    return {
        projectId,
        projectName: name,
        apiKey: keyResult.key,
        keyId: keyResult.id,
    };
}

/**
 * Check if any events have been received for a project.
 * Used during onboarding to verify SDK integration.
 */
export async function checkForTestEvent(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Verify user owns the project
    const [p] = await db.select().from(project).where(
        and(
            eq(project.id, projectId),
            eq(project.userId, session.user.id)
        )
    );

    if (!p) {
        throw new Error("Project not found or unauthorized");
    }

    // Check for ping events in this project
    const events = await db
        .select({
            id: eventLog.id,
            type: eventLog.type,
            payload: eventLog.payload,
            timestamp: eventLog.timestamp
        })
        .from(eventLog)
        .where(
            and(
                eq(eventLog.projectId, projectId),
                eq(eventLog.type, "fullevent.ping")
            )
        )
        .orderBy(desc(eventLog.timestamp))
        .limit(1);

    const hasEvents = events.length > 0;

    return {
        hasEvents,
        event: hasEvents ? events[0] : null,
        eventCount: events.length // Note: This will logically be 1 due to the limit, but sufficient for boolean check
    };
}
