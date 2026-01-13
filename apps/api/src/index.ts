import { serve } from '@hono/node-server'
import { Hono, Context, Next } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { db } from './lib/db'
import { eventLog } from './lib/auth-schema'
import { randomUUID } from 'node:crypto'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
    return c.text('Fullevent API Service')
})

app.post('/ingest', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Ingest: Missing/Invalid Auth Header', authHeader);
        return c.json({ error: 'Missing or invalid API Key' }, 401)
    }

    const apiKey = authHeader.replace('Bearer ', '')
    console.log('Ingest: Verifying key:', apiKey.slice(0, 5) + '...');

    const verifyResult = await auth.api.verifyApiKey({
        body: { key: apiKey }
    })
    console.log('Ingest: Verify Result:', JSON.stringify(verifyResult));

    if (!verifyResult || !verifyResult.valid || !verifyResult.key) {
        return c.json({ error: 'Unauthorized API Key' }, 401)
    }

    const projectId = verifyResult.key.metadata?.projectId as string
    if (!projectId) {
        return c.json({ error: 'API Key not associated with a project' }, 400)
    }

    const body = await c.req.json()
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
        await db.insert(eventLog).values({
            id: eventId,
            projectId: projectId,
            type: body.event || 'unknown',
            payload: JSON.stringify(wideEvent),
            timestamp: new Date(timestamp),
            statusCode,
            outcome,
        });

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
