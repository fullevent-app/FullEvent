/**
 * Checkout Backend API
 * 
 * Demonstrates how backend wide events correlate with frontend events
 * via the x-fullevent-trace-id header.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { wideLogger, WideEventVariables } from '@fullevent/node-sdk';
import 'dotenv/config';

const app = new Hono<{ Variables: WideEventVariables }>();

// CORS for frontend
app.use('/*', cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

// FullEvent middleware - automatically picks up trace_id from headers
app.use('/*', wideLogger({
    apiKey: process.env.FULLEVENT_API_KEY || '',
    baseUrl: 'http://localhost:3005',
    service: 'checkout-backend',
    environment: 'development',
}));

// Simulate database/payment latency
async function simulateLatency(min: number, max: number): Promise<number> {
    const ms = min + Math.random() * (max - min);
    await new Promise(r => setTimeout(r, ms));
    return Math.round(ms);
}

/**
 * POST /api/checkout
 * 
 * The frontend sends a trace_id in the header.
 * This backend event will have the SAME trace_id,
 * allowing you to correlate frontend + backend in the dashboard.
 */
app.post('/api/checkout', async (c) => {
    const event = c.get('wideEvent');
    const body = await c.req.json();

    // Log what trace ID we received (for demo purposes)
    console.log(`[Backend] Received trace_id: ${event.request_id}`);

    // Enrich with business context from frontend
    event.user_id = body.user_id;
    event.cart_id = body.cart_id;
    event.item_count = body.items?.length || 0;
    event.total_cents = body.total_cents;
    event.currency = body.currency || 'USD';

    // Simulate inventory check
    const inventoryLatency = await simulateLatency(20, 80);
    event.inventory_check_ms = inventoryLatency;
    event.inventory_available = true;

    // Simulate payment processing
    const paymentLatency = await simulateLatency(100, 400);
    event.payment_latency_ms = paymentLatency;
    event.payment_provider = 'stripe';
    event.payment_success = true;

    // Simulate order creation
    const orderId = 'order_' + Math.random().toString(36).substring(2, 10);
    const dbLatency = await simulateLatency(10, 50);
    event.db_insert_ms = dbLatency;
    event.order_id = orderId;

    // Total backend processing time is in duration_ms (auto-captured)

    return c.json({
        success: true,
        order_id: orderId,
        trace_id: event.request_id, // Return so frontend can log it
    });
});

/**
 * GET /api/health
 */
app.get('/api/health', (c) => {
    return c.json({ status: 'ok', service: 'checkout-backend' });
});

const port = 3011;
console.log(`
🛒 Checkout Backend running on http://localhost:${port}

This backend automatically correlates with frontend events via trace_id.
When the frontend sends x-fullevent-trace-id header, both events share it.
`);

serve({ fetch: app.fetch, port });
