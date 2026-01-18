"use client";
import React, { createContext, useContext } from 'react';

// ============================================================
// Types - Match Node SDK
// ============================================================

export interface WideEvent {
    // Core Request Context
    request_id?: string;
    trace_id?: string;
    timestamp: string;
    method?: string;
    path?: string;
    status_code?: number;
    duration_ms?: number;
    outcome?: 'success' | 'error';

    // Infrastructure Context
    service?: string;
    region?: string;
    environment?: string;

    // User Context
    user_id?: string;
    user_email?: string;
    user_plan?: string;

    // Error Details
    error?: {
        type: string;
        message: string;
        stack?: string;
        code?: string;
    };

    // Dynamic Business Context
    [key: string]: unknown;
}

export type SamplingConfig = {
    /** Keep 10% of normal requests (0.0 - 1.0) */
    defaultRate?: number;
    /** Always keep error outcomes */
    alwaysKeepErrors?: boolean;
    /** Always keep slow requests (>ms) */
    slowRequestThresholdMs?: number;
};

export type FulleventConfig = {
    apiUrl: string;
    apiKey: string;
    debug?: boolean;
    /** Service name to tag all events with */
    service?: string;
    /** Environment (defaults to 'browser') */
    environment?: string;
    /** Sampling configuration */
    sampling?: SamplingConfig;
};

// Helper for Consistent Sampling
function shouldSample(event: WideEvent, config?: SamplingConfig): boolean {
    const sampling = config ?? {};
    const defaultRate = sampling.defaultRate ?? 1.0;
    const alwaysKeepErrors = sampling.alwaysKeepErrors ?? true;
    const slowThreshold = sampling.slowRequestThresholdMs ?? 2000;

    // Always keep errors
    if (alwaysKeepErrors) {
        if (event.outcome === 'error') return true;
        if (event.status_code && event.status_code >= 400) return true;
    }

    // Always keep slow requests
    if (event.duration_ms && event.duration_ms > slowThreshold) return true;

    // Consistent Sampling based on Trace ID
    if (event.trace_id) {
        let hash = 5381;
        const str = event.trace_id;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        const normalized = (hash >>> 0) % 10000 / 10000;
        return normalized < defaultRate;
    }

    return Math.random() < defaultRate;
}

// ============================================================
// Event Builder - Match Node SDK API
// ============================================================

export interface EventBuilder {
    /** Set any key-value pair on the event */
    set: (key: string, value: unknown) => EventBuilder;
    /** Set the user ID */
    setUser: (userId: string) => EventBuilder;
    /** Capture an error with structured details */
    setError: (err: Error | { type?: string; message: string; code?: string }) => EventBuilder;
    /** Set the status code */
    setStatus: (code: number) => EventBuilder;
    /** Get the underlying event object */
    getEvent: () => WideEvent;
    /** Get the trace ID for this event (for correlating with backend) */
    getTraceId: () => string;
    /** Get headers to pass to fetch() for trace correlation */
    getHeaders: () => Record<string, string>;
    /** Emit the event to FullEvent API */
    emit: () => Promise<void>;
}

function createEventBuilder(
    name: string,
    sendFn: (event: string, properties: Record<string, unknown>, wideEvent: WideEvent) => Promise<void>,
    baseContext: Partial<WideEvent>
): EventBuilder {
    const startTime = Date.now();
    // Generate a unique trace ID for this event
    const traceId = crypto.randomUUID();

    const event: WideEvent = {
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        request_id: traceId,
        ...baseContext,
    };

    const builder: EventBuilder = {
        set(key: string, value: unknown) {
            event[key] = value;
            return builder;
        },

        setUser(userId: string) {
            event.user_id = userId;
            return builder;
        },

        setError(err: Error | { type?: string; message: string; code?: string }) {
            event.outcome = 'error';
            if (err instanceof Error) {
                event.error = {
                    type: err.name,
                    message: err.message,
                    stack: err.stack,
                };
            } else {
                event.error = {
                    type: err.type || 'Error',
                    message: err.message,
                    code: err.code,
                };
            }
            return builder;
        },

        setStatus(code: number) {
            event.status_code = code;
            event.outcome = code >= 400 ? 'error' : 'success';
            return builder;
        },

        getEvent() {
            return event;
        },

        getTraceId() {
            return traceId;
        },

        getHeaders() {
            return {
                'x-fullevent-trace-id': traceId,
            };
        },

        async emit() {
            event.duration_ms = Date.now() - startTime;
            if (!event.outcome) {
                event.outcome = 'success';
            }
            await sendFn(name, event as Record<string, unknown>, event);
        }
    };

    return builder;
}

// ============================================================
// Context & Provider
// ============================================================

type FulleventContextType = {
    /** Quick capture of a simple event */
    capture: (event: string, properties?: Record<string, unknown>) => Promise<void>;
    /** Create a wide event builder for accumulating context */
    createEvent: (name: string) => EventBuilder;
    /** Set global user context for all future events */
    setUser: (userId: string) => void;
};

const FulleventContext = createContext<FulleventContextType | undefined>(undefined);

export const FulleventProvider: React.FC<{ config: FulleventConfig; children: React.ReactNode }> = ({ config, children }) => {
    // Global user context that gets added to all events
    let globalUserId: string | undefined;

    const baseContext: Partial<WideEvent> = {
        service: config.service,
        environment: config.environment || 'browser',
    };

    const capture = async (event: string, properties?: Record<string, unknown>, wideEvent?: WideEvent) => {
        // If it's a wide event (via createEvent), check sampling
        if (wideEvent && !shouldSample(wideEvent, config.sampling)) {
            if (config.debug) {
                console.log(`[Fullevent] Sampling dropped event: ${event}`);
            }
            return;
        }
        if (config.debug) {
            console.log(`[Fullevent] Capturing event: ${event}`, properties);
        }

        const payload = {
            ...baseContext,
            ...properties,
            user_id: properties?.user_id || globalUserId,
        };

        try {
            await fetch(`${config.apiUrl}/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    event,
                    properties: payload,
                    timestamp: new Date().toISOString(),
                }),
            });
        } catch (error) {
            console.error('[Fullevent] Failed to capture event:', error);
        }
    };

    const createEvent = (name: string): EventBuilder => {
        const builder = createEventBuilder(name, capture, {
            ...baseContext,
            user_id: globalUserId,
        });
        return builder;
    };

    const setUser = (userId: string) => {
        globalUserId = userId;
    };

    return (
        <FulleventContext.Provider value={{ capture, createEvent, setUser }}>
            {children}
        </FulleventContext.Provider>
    );
};

export const useFullevent = () => {
    const context = useContext(FulleventContext);
    if (!context) {
        throw new Error('useFullevent must be used within a FulleventProvider');
    }
    return context;
};
