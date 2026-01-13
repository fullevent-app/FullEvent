# Full-Stack Checkout Demo

Demonstrates how frontend and backend events are **correlated via trace_id** for end-to-end observability.

## The Flow

```
┌─────────────────────┐         ┌─────────────────────┐
│     Frontend        │         │      Backend        │
│   (React + SDK)     │         │   (Hono + SDK)      │
└─────────────────────┘         └─────────────────────┘
         │                               │
         │  1. createEvent('checkout')   │
         │     → generates trace_id      │
         │                               │
         │  2. event.getHeaders()        │
         │     → { x-fullevent-trace-id: │
         │         "abc-123-..." }       │
         │                               │
         │  3. fetch('/api/checkout',    │
         │       headers: getHeaders())  │
         │ ─────────────────────────────>│
         │                               │
         │                   4. wideLogger middleware
         │                      reads trace_id from header
         │                      → creates event with SAME id
         │                               │
         │                   5. Enriches with backend context
         │                      (payment, db, etc)
         │                               │
         │  <─────────────────────────── │
         │         response              │
         │                               │
         │  6. event.emit()              │  7. Auto-emits on
         │     (frontend event)          │     response end
         │                               │
         ▼                               ▼
    ┌─────────────────────────────────────────┐
    │           FullEvent Dashboard           │
    │                                         │
    │  Search: trace_id = "abc-123-..."       │
    │                                         │
    │  ┌─────────────────┐ ┌────────────────┐│
    │  │ Frontend Event  │ │ Backend Event  ││
    │  │ checkout_flow   │ │ POST /checkout ││
    │  │ duration: 523ms │ │ duration: 347ms││
    │  │ cart_total: $159│ │ payment: stripe││
    │  └─────────────────┘ └────────────────┘│
    └─────────────────────────────────────────┘
```

## Setup

```bash
# Terminal 1: Start backend
cd examples/fullstack-checkout/backend
pnpm install
pnpm dev

# Terminal 2: Start frontend
cd examples/fullstack-checkout/frontend
pnpm install
pnpm dev
```

## How It Works

### Frontend (React)

```typescript
const { createEvent } = useFullevent();

const event = createEvent('checkout_flow');

// Get headers to pass trace_id to backend
const response = await fetch('/api/checkout', {
  headers: {
    ...event.getHeaders(),  // ← { x-fullevent-trace-id: "..." }
  },
  body: JSON.stringify(cart),
});

// Enrich with frontend context
event.set('cart_total', total);
event.setStatus(response.status);

// Emit frontend event
await event.emit();
```

### Backend (Hono)

```typescript
// wideLogger automatically reads x-fullevent-trace-id
app.use(wideLogger({ apiKey: '...', service: 'backend' }));

app.post('/api/checkout', (c) => {
  const event = c.get('wideEvent');
  // event.request_id === frontend's trace_id!
  
  event.payment_latency_ms = 234;
  event.order_id = 'order_123';
  
  // Auto-emits on response end
});
```

### Result in Dashboard

Both events have the **same trace_id**, so you can:

1. Search by trace_id to see the full request flow
2. See frontend context (viewport, cart items) AND backend context (payment, DB queries)
3. Calculate total end-to-end latency
