'use client';

import { useState } from 'react';

export function LogComparison() {
    const [traditionalLogs, setTraditionalLogs] = useState<string[]>([]);
    const [wideLog, setWideLog] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const runSimulation = async () => {
        setLoading(true);
        setTraditionalLogs([]);
        setWideLog(null);

        try {
            // Run Traditional
            const resTrad = await fetch('http://localhost:3002/simulation/traditional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user_123', cartId: 'cart_abc', email: 'user@example.com' })
            });
            const dataTrad = await resTrad.json();
            setTraditionalLogs(dataTrad.logs || []);

            // Run Wide
            const resWide = await fetch('http://localhost:3002/simulation/wide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user_456', cartId: 'cart_xyz', email: 'wide@example.com' })
            });
            const dataWide = await resWide.json();
            setWideLog(JSON.stringify(dataWide.log, null, 2));

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Logging Paradigm Comparison</h2>
                <button
                    onClick={runSimulation}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Running Simulation...' : 'Run Live Comparison'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traditional Column */}
                <div className="space-y-2">
                    <h3 className="font-medium text-gray-500 text-sm uppercase tracking-wider">Traditional Logging</h3>
                    <div className="bg-zinc-950 text-emerald-400 p-4 rounded-lg font-mono text-xs h-[400px] overflow-y-auto border border-zinc-800 shadow-inner">
                        {!traditionalLogs.length && !loading && <span className="text-zinc-600">{'// No logs yet. Run simulation.'}</span>}
                        {traditionalLogs.map((log, i) => (
                            <div key={i} className="mb-1 border-l-2 border-emerald-900 pl-2 opacity-90 hover:opacity-100 transition-opacity">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Wide Events Column */}
                <div className="space-y-2">
                    <h3 className="font-medium text-gray-500 text-sm uppercase tracking-wider">Wide Events (Canonical)</h3>
                    <div className="bg-zinc-950 text-blue-300 p-4 rounded-lg font-mono text-xs h-[400px] overflow-y-auto border border-zinc-800 shadow-inner whitespace-pre">
                        {!wideLog && !loading && <span className="text-zinc-600">{'// No wide event yet. Run simulation.'}</span>}
                        {wideLog}
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500">
                <p>Simulating 2 requests to <code className="bg-gray-100 px-1 rounded">apps/demo</code> (Port 3002)</p>
            </div>
        </div>
    );
}
