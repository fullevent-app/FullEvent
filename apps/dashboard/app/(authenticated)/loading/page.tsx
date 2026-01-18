"use client";

import { GridLoader, PATTERNS, PatternName } from "@/components/ui/grid-loader";

export default function Loading() {
    const patternNames = Object.keys(PATTERNS) as PatternName[];

    return (
        <div className="min-h-screen bg-black p-12">
            <h1 className="text-3xl font-bold text-white mb-2">Grid Loader Patterns</h1>
            <p className="text-zinc-500 mb-10">{patternNames.length} animation patterns</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8">
                {patternNames.map((name) => (
                    <div key={name} className="flex flex-col items-center gap-3">
                        <GridLoader pattern={name} size={64} color="#ff6b6b" glow={true} />
                        <span className="text-xs text-zinc-500 font-mono">{name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}