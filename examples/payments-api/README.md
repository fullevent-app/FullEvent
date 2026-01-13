# PayFlow API - FullEvent SDK Example

A simple payments processing API demonstrating how to integrate the FullEvent SDK.

## What This Demonstrates

1. **Automatic Request Instrumentation** - Every request gets a wide event with method, path, status, duration
2. **Business Context Enrichment** - Handlers add payment-specific fields (customer_id, amount, etc.)
3. **Tail-Based Sampling** - Configure what to keep vs drop
4. **Error Capture** - Errors are automatically captured with stack traces
5. **Distributed Tracing** - Trace IDs propagate via headers

## Setup

```bash
# From the monorepo root
pnpm install
cd examples/payments-api
pnpm dev
```

## Environment Variables

```bash
FULLEVENT_API_KEY=your_api_key_here  # Get from FullEvent dashboard
```

## Example Requests

```bash
# Create a payment
curl -X POST http://localhost:3010/payments \
  -H "Content-Type: application/json" \
  -d '{"amount_cents": 2999, "currency": "USD", "customer_id": "cust_123"}'

# Get a payment
curl http://localhost:3010/payments/pay_xxx

# Refund a payment
curl -X POST http://localhost:3010/payments/pay_xxx/refund

# Trigger an error (for testing)
curl http://localhost:3010/payments/simulate-error
```

## What Gets Logged

Each request creates a wide event like:

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-08T22:00:00.000Z",
  "method": "POST",
  "path": "/payments",
  "status_code": 201,
  "duration_ms": 347,
  "outcome": "success",
  "service": "payflow-api",
  "environment": "development",
  
  "customer_id": "cust_123",
  "amount_cents": 2999,
  "currency": "USD",
  "payment_id": "pay_abc123",
  "payment_action": "create",
  "payment_status": "completed",
  "provider_latency_ms": 234,
  "provider_success": true
}
```

All these fields are searchable and filterable in your FullEvent dashboard!
