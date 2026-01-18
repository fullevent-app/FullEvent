import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './lib/db'
import { clickhouse, ensureTableExists } from './lib/clickhouse'
import { apikey, project } from './lib/auth-schema'
import { randomUUID, createHash } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { stackServerApp } from './lib/stack'

// Ensure ClickHouse table exists
ensureTableExists().catch(console.error)

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
    return c.text('Fullevent API Service')
})

/**
 * Hash an API key using SHA-256 (same method as dashboard)
 */
function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

/**
 * Get monthly event count for a user
 */
async function getMonthlyEventCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get user's projects from Turso (sqlite) first
    // We cannot join between ClickHouse and Sqlite directly
    const userProjects = await db.select({ id: project.id })
        .from(project)
        .where(eq(project.userId, userId));

    if (userProjects.length === 0) {
        return 0;
    }

    const projectIds = userProjects.map(p => p.id);

    const result = await clickhouse.query({
        query: `
            SELECT count() as count 
            FROM event_log 
            WHERE project_id IN ({projectIds:Array(String)})
            AND timestamp >= {startOfMonth:DateTime}
        `,
        query_params: {
            projectIds,
            startOfMonth: Math.floor(startOfMonth.getTime() / 1000)
        },
        format: 'JSONEachRow'
    });

    const rows = await result.json() as { count: string }[];
    return parseInt(rows[0]?.count || '0', 10);
}

/**
 * Verify an API key against our database
 * Returns the key record if valid, null otherwise
 */
async function verifyApiKey(rawKey: string) {
    const keyHash = hashApiKey(rawKey);

    const [keyRecord] = await db.select()
        .from(apikey)
        .where(
            and(
                eq(apikey.key, keyHash),
                eq(apikey.enabled, true)
            )
        )
        .limit(1);

    if (!keyRecord) {
        return null;
    }

    // Check if key has expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        return null;
    }

    // Update request count and last request time
    await db.update(apikey)
        .set({
            requestCount: keyRecord.requestCount + 1,
            lastRequest: new Date(),
        })
        .where(eq(apikey.id, keyRecord.id));

    return keyRecord;
}

app.post('/ingest', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Ingest: Missing/Invalid Auth Header', authHeader);
        return c.json({ error: 'Missing or invalid API Key' }, 401)
    }

    const rawApiKey = authHeader.replace('Bearer ', '')
    console.log('Ingest: Verifying key:', rawApiKey.slice(0, 8) + '...');

    const keyRecord = await verifyApiKey(rawApiKey);

    if (!keyRecord) {
        console.log('Ingest: Invalid or disabled API key');
        return c.json({ error: 'Unauthorized API Key' }, 401)
    }

    // Parse metadata to get projectId
    let projectId: string | null = null;
    try {
        const metadata = keyRecord.metadata ? JSON.parse(keyRecord.metadata) : null;
        projectId = metadata?.projectId || null;
    } catch {
        console.log('Ingest: Failed to parse key metadata');
    }

    if (!projectId) {
        return c.json({ error: 'API Key not associated with a project' }, 400)
    }

    // Check event limit for user
    const userId = keyRecord.userId;
    if (userId) {
        try {
            const user = await stackServerApp.getUser(userId);
            if (user) {
                const limits = (user.serverMetadata as { limits?: { eventsPerMonth?: number } })?.limits;
                const eventsPerMonth = limits?.eventsPerMonth ?? 1000; // Default free tier limit

                const currentCount = await getMonthlyEventCount(userId);
                if (currentCount >= eventsPerMonth) {
                    console.log(`Ingest: Event limit reached for user ${userId}: ${currentCount}/${eventsPerMonth}`);
                    return c.json({
                        error: 'Monthly event limit reached. Upgrade your plan to log more events.',
                        limitReached: true,
                        currentCount,
                        limit: eventsPerMonth
                    }, 429)
                }
            }
        } catch (err) {
            // Log but don't block on limit check failure
            console.error('Failed to check event limit:', err);
        }
    }

    console.log('Ingest: Key verified for project:', projectId, 'user:', keyRecord.userId);


    const body = await c.req.json()

    // Check for duplicate ping
    // We only allow one "fullevent.ping" event per project to prevent log pollution
    if (body.event === 'fullevent.ping' && projectId) {
        const result = await clickhouse.query({
            query: `
                SELECT 1 
                FROM event_log 
                WHERE project_id = {projectId:String} 
                AND type = 'fullevent.ping' 
                LIMIT 1
            `,
            query_params: {
                projectId
            },
            format: 'JSONEachRow'
        })

        const rows = await result.json()

        if ((rows as any[]).length > 0) {
            console.log(`Ingest: Ping ignored: Project ${projectId} already received ping`);
            return c.json({ success: true }); // Return success to client so it doesn't error
        }
    }

    const userProperties = body.properties || {}
    const eventId = randomUUID()
    const timestamp = body.timestamp || new Date().toISOString()

    // Build the wide event in the canonical format
    // User properties are spread at the top level, with FullEvent metadata nested
    const wideEvent = {
        // FullEvent metadata (nested to avoid polluting user namespace)
        fullevent: {
            event_id: eventId,
            event_type: body.event,
            project_id: projectId,
            timestamp: timestamp,
            ingested_at: new Date().toISOString(),
        },

        // User's trace_id takes precedence if provided
        trace_id: userProperties.trace_id || randomUUID(),

        // Spread user properties at top level (the canonical wide event format)
        ...userProperties,
    }

    // Extract first-class fields for database indexing
    const rawStatusCode = userProperties.status_code ?? userProperties.statusCode ?? userProperties.http_status ?? userProperties.httpStatus ?? userProperties.response_code;
    const statusCode = typeof rawStatusCode === 'number' ? rawStatusCode : null;
    const outcome = typeof userProperties.outcome === 'string' ? userProperties.outcome : null;

    try {
        await clickhouse.insert({
            table: 'event_log',
            values: [{
                id: eventId,
                project_id: projectId,
                type: body.event || 'unknown',
                payload: JSON.stringify(wideEvent),
                timestamp: Math.floor(new Date(timestamp).getTime() / 1000), // ClickHouse DateTime expects unix timestamp in seconds or string
                status_code: statusCode,
                outcome,
            }],
            format: 'JSONEachRow'
        })

        console.log(`Ingested event for project ${projectId}:`, body.event)
        return c.json({ success: true })
    } catch (err) {
        console.error('Failed to persist event log:', err);
        return c.json({ error: 'Failed to store event' }, 500)
    }
})

const port = 3005
console.log(`Server is running on port ${port}`)

serve({
    fetch: app.fetch,
    port
})
