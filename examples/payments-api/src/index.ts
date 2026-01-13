/**
 * PayFlow API - Example Payments Processing Company
 * 
 * This example demonstrates how to integrate the FullEvent SDK
 * into a real-world payments API. Every request automatically
 * creates a wide event with request context, and handlers enrich
 * it with business-specific data.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { wideLogger, WideEventVariables } from '@fullevent/node-sdk';

// ============================================================
// App Setup with FullEvent SDK
// ============================================================

const app = new Hono<{ Variables: WideEventVariables }>();

// The wideLogger middleware automatically:
// - Creates a wide event for each request
// - Captures method, path, status code, duration
// - Handles distributed tracing via x-fullevent-trace-id header
// - Sends events to FullEvent API with tail-based sampling
app.use('/*', wideLogger({
    apiKey: process.env.FULLEVENT_API_KEY || '',  // Get from FullEvent dashboard
    service: 'payflow-api',
    environment: process.env.NODE_ENV || 'development',
    sampling: {
        defaultRate: 1.0,           // Keep 100% in dev, lower in prod
        alwaysKeepErrors: true,     // Never drop errors
        slowRequestThresholdMs: 500, // Keep slow requests
    }
}));

// ============================================================
// Simulated Database & Payment Provider
// ============================================================

interface Payment {
    id: string;
    amount_cents: number;
    currency: string;
    customer_id: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    created_at: string;
}

const payments = new Map<string, Payment>();

function generateId() {
    return 'pay_' + Math.random().toString(36).substring(2, 15);
}

// Simulate payment provider latency
async function simulatePaymentProvider(shouldFail = false): Promise<{ success: boolean; latency_ms: number }> {
    const latency = 100 + Math.random() * 400; // 100-500ms
    await new Promise(resolve => setTimeout(resolve, latency));
    return { success: !shouldFail, latency_ms: Math.round(latency) };
}

// ============================================================
// API Routes
// ============================================================

app.get('/', (c) => {
    return c.json({
        name: 'PayFlow API',
        version: '1.0.0',
        endpoints: [
            'POST /payments - Create a payment',
            'GET /payments/:id - Get payment details',
            'POST /payments/:id/refund - Refund a payment',
        ]
    });
});

/**
 * Create a new payment
 * 
 * This handler demonstrates enriching the wide event with
 * business context that makes debugging much easier.
 */
app.post('/payments', async (c) => {
    const event = c.get('wideEvent');

    const body = await c.req.json();
    const { amount_cents, currency, customer_id } = body;

    // Validate input
    if (!amount_cents || !currency || !customer_id) {
        event.validation_error = 'missing_fields';
        return c.json({ error: 'Missing required fields' }, 400);
    }

    // Enrich the wide event with business context
    // These fields are now searchable/filterable in your dashboard
    event.customer_id = customer_id;
    event.amount_cents = amount_cents;
    event.currency = currency;
    event.payment_action = 'create';

    // Simulate calling the payment provider
    const shouldFail = amount_cents > 100000; // Fail large payments for demo
    const providerResult = await simulatePaymentProvider(shouldFail);

    event.provider_latency_ms = providerResult.latency_ms;
    event.provider_success = providerResult.success;

    if (!providerResult.success) {
        event.failure_reason = 'provider_declined';
        return c.json({
            error: 'Payment declined by provider',
            reason: 'amount_too_large'
        }, 402);
    }

    // Create the payment
    const payment: Payment = {
        id: generateId(),
        amount_cents,
        currency,
        customer_id,
        status: 'completed',
        created_at: new Date().toISOString(),
    };
    payments.set(payment.id, payment);

    // Add payment ID to the event for tracing
    event.payment_id = payment.id;
    event.payment_status = 'completed';

    return c.json(payment, 201);
});

/**
 * Get payment details
 */
app.get('/payments/:id', async (c) => {
    const event = c.get('wideEvent');
    const id = c.req.param('id');

    event.payment_id = id;
    event.payment_action = 'read';

    const payment = payments.get(id);

    if (!payment) {
        event.not_found = true;
        return c.json({ error: 'Payment not found' }, 404);
    }

    event.customer_id = payment.customer_id;
    event.amount_cents = payment.amount_cents;

    return c.json(payment);
});

/**
 * Refund a payment
 * 
 * Demonstrates error handling and how errors are captured
 * in the wide event automatically.
 */
app.post('/payments/:id/refund', async (c) => {
    const event = c.get('wideEvent');
    const id = c.req.param('id');

    event.payment_id = id;
    event.payment_action = 'refund';

    const payment = payments.get(id);

    if (!payment) {
        event.not_found = true;
        return c.json({ error: 'Payment not found' }, 404);
    }

    if (payment.status === 'refunded') {
        event.already_refunded = true;
        return c.json({ error: 'Payment already refunded' }, 400);
    }

    event.customer_id = payment.customer_id;
    event.amount_cents = payment.amount_cents;
    event.original_status = payment.status;

    // Simulate refund processing
    const providerResult = await simulatePaymentProvider();
    event.provider_latency_ms = providerResult.latency_ms;

    // Update payment status
    payment.status = 'refunded';
    event.payment_status = 'refunded';
    event.refund_success = true;

    return c.json({
        message: 'Payment refunded successfully',
        payment
    });
});

/**
 * Simulate an error (for testing error capture)
 */
app.get('/payments/simulate-error', async (c) => {
    const event = c.get('wideEvent');
    event.simulated = true;

    // This error will be automatically captured by the middleware
    throw new Error('Simulated database connection error');
});

// ============================================================
// Start Server
// ============================================================

const port = 3010;
console.log(`
🚀 PayFlow API running on http://localhost:${port}

Example requests:
  
  # Create a payment
  curl -X POST http://localhost:${port}/payments \\
    -H "Content-Type: application/json" \\
    -d '{"amount_cents": 2999, "currency": "USD", "customer_id": "cust_123"}'
  
  # Get a payment
  curl http://localhost:${port}/payments/pay_xxx
  
  # Refund a payment  
  curl -X POST http://localhost:${port}/payments/pay_xxx/refund
  
  # Trigger an error
  curl http://localhost:${port}/payments/simulate-error

Each request creates a wide event with full context!
`);

serve({ fetch: app.fetch, port });
