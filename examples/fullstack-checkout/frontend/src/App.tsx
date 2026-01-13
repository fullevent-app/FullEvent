import { useState } from 'react';
import { useFullevent } from '@fullevent/react';

/**
 * Checkout Demo Component
 * 
 * Demonstrates how frontend and backend events are correlated
 * via a shared trace_id for end-to-end observability.
 */
export default function App() {
    const { createEvent } = useFullevent();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);
    const [traceId, setTraceId] = useState<string | null>(null);

    // Sample cart items
    const cartItems = [
        { name: 'Premium Widget', price: 2999 },
        { name: 'Super Gadget', price: 4999 },
        { name: 'Mega Device', price: 7999 },
    ];
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);

    const handleCheckout = async () => {
        setLoading(true);
        setResult(null);

        // Create a wide event for the entire checkout flow
        const event = createEvent('checkout_flow');

        // Get the trace ID - this will be shared with the backend
        const currentTraceId = event.getTraceId();
        setTraceId(currentTraceId);
        console.log(`[Frontend] Starting checkout with trace_id: ${currentTraceId}`);

        // Enrich with frontend context
        event
            .setUser('user_demo_123')
            .set('cart_item_count', cartItems.length)
            .set('cart_total_cents', total)
            .set('currency', 'USD')
            .set('page', 'checkout')
            .set('viewport_width', window.innerWidth);

        try {
            // Call the backend API with trace headers
            // The backend will use the same trace_id in its event
            const response = await fetch('http://localhost:3011/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // THIS IS THE KEY: Pass trace_id to backend
                    ...event.getHeaders(),
                },
                body: JSON.stringify({
                    user_id: 'user_demo_123',
                    cart_id: 'cart_' + Date.now(),
                    items: cartItems,
                    total_cents: total,
                    currency: 'USD',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                event
                    .set('order_id', data.order_id)
                    .set('backend_trace_id', data.trace_id)
                    .setStatus(200);

                setResult({
                    success: true,
                    message: `Order ${data.order_id} placed successfully!`,
                    orderId: data.order_id,
                });
            } else {
                event
                    .setError({ type: 'CheckoutError', message: data.error || 'Unknown error' })
                    .setStatus(response.status);

                setResult({
                    success: false,
                    message: data.error || 'Checkout failed',
                });
            }
        } catch (err) {
            // Network error
            event.setError(err instanceof Error ? err : { type: 'NetworkError', message: String(err) });
            setResult({
                success: false,
                message: 'Network error - is the backend running?',
            });
        } finally {
            // Emit the frontend event
            await event.emit();
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h1>🛒 Checkout Demo</h1>
            <p className="subtitle">Frontend + Backend Wide Event Correlation</p>

            <div className="cart">
                {cartItems.map((item, i) => (
                    <div key={i} className="cart-item">
                        <span>{item.name}</span>
                        <span>${(item.price / 100).toFixed(2)}</span>
                    </div>
                ))}
                <div className="cart-total">
                    <span>Total</span>
                    <span>${(total / 100).toFixed(2)}</span>
                </div>
            </div>

            <button
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={loading}
            >
                {loading ? 'Processing...' : 'Complete Checkout'}
            </button>

            {result && (
                <div className={`status ${result.success ? 'success' : 'error'}`}>
                    {result.message}
                </div>
            )}

            {traceId && (
                <div className="trace-info">
                    <h3>🔗 Distributed Trace</h3>
                    <p>Both frontend and backend events share this trace_id:</p>
                    <p className="trace-id">{traceId}</p>
                    <p style={{ marginTop: 12, color: '#888' }}>
                        Search for this ID in your dashboard to see both events!
                    </p>
                </div>
            )}
        </div>
    );
}
