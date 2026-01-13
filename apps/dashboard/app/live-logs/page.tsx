'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface WideEvent {
    request_id?: string;
    type?: string;
    [key: string]: unknown;
}

export default function LiveLogsPage() {
    const [events, setEvents] = useState<WideEvent[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:3005/events');
            const data = await res.json();
            setEvents(data.events || []);
        } catch (err) {
            console.error("Failed to fetch events", err);
        }
    }, []);

    useEffect(() => {
        void fetchEvents(); // eslint-disable-line
        const interval = setInterval(() => {
            if (autoRefresh) fetchEvents();
        }, 2000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchEvents]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Live Logs</h1>
                    <p className="text-muted-foreground">Streaming &quot;Wide Events&quot; from our own dogfooding API.</p>
                </div>
                <div className="space-x-4">
                    <Button variant="outline" onClick={() => setAutoRefresh(!autoRefresh)}>
                        {autoRefresh ? 'Pause Stream' : 'Resume Stream'}
                    </Button>
                    <Link href="/dashboard">
                        <Button variant="secondary">Back to Dashboard</Button>
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                {events.length === 0 && (
                    <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground">
                        Waiting for events... Go to the dashboard and trigger some!
                    </div>
                )}
                {events.map((event, i) => (
                    <div key={i} className="p-4 border rounded-lg bg-zinc-950 font-mono text-xs text-blue-300 overflow-x-auto shadow-sm">
                        <pre>{JSON.stringify(event, null, 2)}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
}
