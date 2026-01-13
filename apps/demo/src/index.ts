import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { wideLogger, WideEventVariables } from '@fullevent/node-sdk'

const app = new Hono<{ Variables: WideEventVariables }>()

app.use('/*', cors({
    origin: '*',
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
}))

// Helper for "Traditional" spaghetti logging
const logger = {
    info: (msg: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, ...args),
}

app.get('/', (c) => c.text('Comparison Demo: POST /simulation/traditional vs /simulation/wide'))

// -------------------------------------------------------------------------
// SCENARIO 1: TRADITIONAL LOGGING (The "Mess")
// -------------------------------------------------------------------------
app.post('/simulation/traditional', async (c) => {
    const requestId = crypto.randomUUID();
    const body = await c.req.json();
    const logs: string[] = [];

    // Local helper to capture logs + print them
    const log = {
        info: (msg: string) => {
            const line = `[${new Date().toISOString()}] INFO: ${msg}`;
            console.log(line);
            logs.push(line);
        },
        error: (msg: string) => {
            const line = `[${new Date().toISOString()}] ERROR: ${msg}`;
            console.error(line);
            logs.push(line);
        }
    };

    log.info(`[${requestId}] Starting checkout for user ${body.userId}`);

    // Step 1: Get Cart
    log.info(`[${requestId}] Fetching cart ${body.cartId}`);
    // Simulate DB latency
    await new Promise(r => setTimeout(r, 50));
    log.info(`[${requestId}] Cart found. Total: 100.00`);

    // Step 2: Process Payment
    log.info(`[${requestId}] Processing payment with Stripe`);
    // Simulate Payment Latency
    await new Promise(r => setTimeout(r, 150));

    if (body.forceError) {
        log.error(`[${requestId}] Payment failed! Code: card_declined`);
        log.error(`[${requestId}] Stack trace: Error: Card declined at payment.ts:42...`);
        return c.json({ error: 'Payment failed', logs }, 500);
    }

    log.info(`[${requestId}] Payment successful. Order placed.`);

    // Step 3: Send Email
    log.info(`[${requestId}] Sending confirmation email to ${body.email}`);
    await new Promise(r => setTimeout(r, 200));

    log.info(`[${requestId}] Request completed in 400ms`);
    return c.json({ success: true, orderId: 'ord_123', logs });
});


// -------------------------------------------------------------------------
// SCENARIO 2: WIDE EVENTS (The "Clean" solution)
// -------------------------------------------------------------------------
// Apply middleware ONLY to this route for demo purposes (or globally in real apps)
app.use('/simulation/wide', wideLogger('checkout-service'));

app.post('/simulation/wide', async (c) => {
    // 1. Get the Event Object (created by middleware)
    const event = c.get('wideEvent');
    const body = await c.req.json();

    // 2. Enrich with User Context
    event.user = {
        id: body.userId,
        email: body.email,
        type: 'premium' // simulated
    };

    // Step 1: Get Cart
    // db call...
    await new Promise(r => setTimeout(r, 50));
    // Enrich with Business Context
    event.cart = {
        id: body.cartId,
        item_count: 5,
        total_cents: 10000,
        currency: 'USD'
    };

    // Step 2: Process Payment
    const paymentStart = Date.now();
    await new Promise(r => setTimeout(r, 150));
    event.payment = {
        provider: 'stripe',
        latency_ms: Date.now() - paymentStart,
        method: 'credit_card'
    };

    if (body.forceError) {
        event.payment.error_code = 'card_declined';
        // Hono middleware catches the error and sets logging outcome='error'
        throw new Error('Card declined');
    }

    // Step 3: Email
    await new Promise(r => setTimeout(r, 200));
    event.email_sent = true;

    // Return the event in the response so the frontend can display it
    return c.json({ success: true, orderId: 'ord_123', log: event });
});

const port = 3002
console.log(`Demo Server running request simulation on port ${port}`)

serve({
    fetch: app.fetch,
    port
})
