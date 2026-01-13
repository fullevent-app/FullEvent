"use client";

import { motion } from "motion/react";
import { useEffect, useState, useMemo } from "react";

// Pattern definitions - each array defines the order blocks light up (0-8)
// Grid layout:
// 0 1 2
// 3 4 5
// 6 7 8

export const PATTERNS = {
    // === WAVE PATTERNS ===
    "wave-lr": [0, 3, 6, 1, 4, 7, 2, 5, 8],      // Left to right
    "wave-rl": [2, 5, 8, 1, 4, 7, 0, 3, 6],      // Right to left
    "wave-tb": [0, 1, 2, 3, 4, 5, 6, 7, 8],      // Top to bottom
    "wave-bt": [6, 7, 8, 3, 4, 5, 0, 1, 2],      // Bottom to top

    // === DIAGONAL PATTERNS ===
    "diagonal-tl": [0, 1, 3, 2, 4, 6, 5, 7, 8],  // From top-left
    "diagonal-tr": [2, 1, 5, 0, 4, 8, 3, 7, 6],  // From top-right
    "diagonal-bl": [6, 3, 7, 0, 4, 8, 1, 5, 2],  // From bottom-left
    "diagonal-br": [8, 5, 7, 2, 4, 6, 1, 3, 0],  // From bottom-right

    // === RIPPLE PATTERNS ===
    "ripple-out": [4, 1, 3, 5, 7, 0, 2, 6, 8],   // Center outward
    "ripple-in": [0, 2, 6, 8, 1, 3, 5, 7, 4],    // Corners inward

    // === SPIRAL PATTERNS ===
    "spiral": [4, 1, 2, 5, 8, 7, 6, 3, 0],       // Spiral from center
    "spiral-cw": [0, 1, 2, 5, 8, 7, 6, 3, 4],    // Clockwise spiral
    "spiral-ccw": [0, 3, 6, 7, 8, 5, 2, 1, 4],   // Counter-clockwise spiral
    "spiral-in": [0, 1, 2, 5, 8, 7, 6, 3, 4],    // Spiral inward
    "spiral-out": [4, 3, 6, 7, 8, 5, 2, 1, 0],   // Spiral outward from center

    // === SHAPE PATTERNS ===
    "cross": [4, 1, 3, 5, 7, 4, 1, 3, 5],        // Plus shape
    "x-shape": [0, 2, 4, 6, 8, 4, 0, 2, 6],      // X shape
    "corners": [0, 2, 8, 6, 0, 2, 8, 6, 4],      // Four corners
    "diamond": [1, 3, 5, 7, 4, 1, 3, 5, 7],      // Diamond

    // === LINE PATTERNS ===
    "stripes-h": [0, 1, 2, 6, 7, 8, 3, 4, 5],    // Horizontal stripes
    "stripes-v": [0, 3, 6, 2, 5, 8, 1, 4, 7],    // Vertical stripes
    "line-h-top": [0, 1, 2, 0, 1, 2, 0, 1, 2],   // Top row only
    "line-h-mid": [3, 4, 5, 3, 4, 5, 3, 4, 5],   // Middle row only
    "line-h-bot": [6, 7, 8, 6, 7, 8, 6, 7, 8],   // Bottom row only
    "line-v-left": [0, 3, 6, 0, 3, 6, 0, 3, 6],  // Left column only
    "line-v-mid": [1, 4, 7, 1, 4, 7, 1, 4, 7],   // Middle column only
    "line-v-right": [2, 5, 8, 2, 5, 8, 2, 5, 8], // Right column only

    // === SNAKE PATTERNS ===
    "snake": [0, 1, 2, 5, 4, 3, 6, 7, 8],        // Snake pattern
    "snake-rev": [8, 7, 6, 3, 4, 5, 2, 1, 0],    // Reverse snake

    // === RAIN PATTERNS ===
    "rain": [0, 1, 2, 3, 4, 5, 6, 7, 8],         // Top to bottom
    "rain-rev": [6, 7, 8, 3, 4, 5, 0, 1, 2],     // Bottom to top

    // === SOLO PATTERNS ===
    "solo-center": [4, 4, 4, 4, 4, 4, 4, 4, 4],  // Center only
    "solo-tl": [0, 0, 0, 0, 0, 0, 0, 0, 0],      // Top-left only
    "solo-br": [8, 8, 8, 8, 8, 8, 8, 8, 8],      // Bottom-right only

    // === FRAME PATTERNS ===
    "frame": [0, 1, 2, 5, 8, 7, 6, 3, 0],        // Outer frame
    "frame-sync": [0, 1, 2, 3, 5, 6, 7, 8, 4],   // Frame then center

    // === CHECKERBOARD ===
    "checkerboard": [0, 2, 4, 6, 8, 1, 3, 5, 7], // Checkerboard pattern

    // === L-SHAPES ===
    "L-tl": [0, 1, 2, 3, 6, 0, 1, 2, 3],         // L top-left
    "L-tr": [0, 1, 2, 5, 8, 0, 1, 2, 5],         // L top-right
    "L-bl": [0, 3, 6, 7, 8, 0, 3, 6, 7],         // L bottom-left
    "L-br": [2, 5, 6, 7, 8, 2, 5, 6, 7],         // L bottom-right

    // === T-SHAPES ===
    "T-top": [0, 1, 2, 4, 7, 0, 1, 2, 4],        // T pointing down
    "T-bot": [1, 4, 6, 7, 8, 1, 4, 6, 7],        // T pointing up
    "T-left": [0, 3, 4, 5, 6, 0, 3, 4, 5],       // T pointing right
    "T-right": [2, 3, 4, 5, 8, 2, 3, 4, 5],      // T pointing left

    // === DUO PATTERNS ===
    "duo-h": [3, 5, 3, 5, 3, 5, 3, 5, 3],        // Two horizontal
    "duo-v": [1, 7, 1, 7, 1, 7, 1, 7, 1],        // Two vertical
    "duo-diag": [0, 8, 0, 8, 0, 8, 0, 8, 0],     // Two diagonal

    // === RANDOM/DEFAULT ===
    "random": [0, 1, 2, 3, 4, 5, 6, 7, 8],       // Will be shuffled
} as const;

export type PatternName = keyof typeof PATTERNS;

interface GridLoaderProps {
    size?: number;
    color?: string;
    className?: string;
    pattern?: PatternName | PatternName[] | "cycle";
    cycleDuration?: number; // How long each pattern plays before switching (ms)
    glow?: boolean; // Whether to show glow effect (default: false)
}

// Shuffle array (for random pattern)
function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Parse color to rgba components
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        };
    }
    // Default to cyan if parsing fails
    return { r: 34, g: 211, b: 238 };
}

export function GridLoader({
    size = 48,
    color = "#f5d0b0",
    className = "",
    pattern = "cycle",
    cycleDuration = 2000,
    glow = false,
}: GridLoaderProps) {
    const [activePatternIndex, setActivePatternIndex] = useState(0);
    const blockSize = size / 3;
    const gap = 2;

    const rgb = useMemo(() => hexToRgb(color), [color]);

    // Determine which patterns to use
    const patternList = useMemo(() => {
        if (pattern === "cycle") {
            // Default: cycle through a nice variety
            return ["wave-lr", "spiral-cw", "ripple-out", "diagonal-tl"] as PatternName[];
        }
        if (Array.isArray(pattern)) {
            return pattern;
        }
        return [pattern];
    }, [pattern]);

    const currentPatternName = patternList[activePatternIndex % patternList.length];
    const currentPattern = useMemo(() => {
        if (currentPatternName === "random") {
            return shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        }
        return [...PATTERNS[currentPatternName]];
    }, [currentPatternName]); // Re-shuffle on pattern change

    // Cycle through patterns
    useEffect(() => {
        if (patternList.length <= 1) return;

        const interval = setInterval(() => {
            setActivePatternIndex((prev) => (prev + 1) % patternList.length);
        }, cycleDuration);
        return () => clearInterval(interval);
    }, [patternList.length, cycleDuration]);

    return (
        <div
            className={`relative ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Grid */}
            <div
                className="relative grid grid-cols-3"
                style={{ gap, width: size, height: size }}
            >
                {Array.from({ length: 9 }).map((_, index) => {
                    const delay = currentPattern.indexOf(index) * 0.1;

                    return (
                        <div key={`${currentPatternName}-${index}`} className="relative">
                            {/* Per-block glow - only shows when this block is lit */}
                            {glow && (
                                <motion.div
                                    className="absolute inset-0 blur-md pointer-events-none"
                                    style={{
                                        width: blockSize - gap,
                                        height: blockSize - gap,
                                    }}
                                    animate={{
                                        backgroundColor: [
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`,
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
                                            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`,
                                        ],
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        delay,
                                        repeat: Infinity,
                                        ease: "linear",
                                        times: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
                                    }}
                                />
                            )}
                            {/* The actual block */}
                            <motion.div
                                style={{
                                    width: blockSize - gap,
                                    height: blockSize - gap,
                                }}
                                animate={{
                                    backgroundColor: [
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`,
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                                        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`,
                                    ],
                                }}
                                transition={{
                                    duration: 1.2,
                                    delay,
                                    repeat: Infinity,
                                    ease: "linear",
                                    times: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Preset variants
export function CyanGridLoader({ size = 48, className = "", pattern }: { size?: number; className?: string; pattern?: PatternName | PatternName[] | "cycle" }) {
    return <GridLoader size={size} color="#22d3ee" className={className} pattern={pattern} />;
}
