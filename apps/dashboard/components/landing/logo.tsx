"use client";

import { motion } from "motion/react";
import { useState } from "react";

interface LogLineLogoProps {
    size?: number;
    animated?: boolean;
    className?: string;
    variant?: "pulse" | "stream";
}

export function LogLineLogo({ size = 32, animated = true, className = "", variant = "pulse" }: LogLineLogoProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Clean F shape: vertical stem + two horizontal bars
    // Colors match the background log lines: cyan (info), yellow (warn), red (error)
    const lines = [
        // Top horizontal bar (longest) - cyan/info
        { x: 0, y: 0, width: 100, color: "#06b6d4", delay: 0 },
        // Middle horizontal bar (medium) - yellow/warn
        { x: 0, y: 40, width: 70, color: "#eab308", delay: 0.1 },
        // Bottom of stem (shortest) - red/error
        { x: 0, y: 80, width: 35, color: "#ef4444", delay: 0.2 },
    ];

    // Stream variant: continuous log stream scrolling up
    if (variant === "stream") {
        // Stream lines that will scroll - starts with the F shape, then continues
        const streamLines = [
            { y: 0, width: 100, color: "#06b6d4" },   // F top (matches static)
            { y: 40, width: 70, color: "#eab308" },   // F middle (matches static)
            { y: 80, width: 35, color: "#ef4444" },   // F bottom (matches static)
            { y: 120, width: 85, color: "#06b6d4" },  // incoming
            { y: 160, width: 50, color: "#eab308" },  // incoming
            { y: 200, width: 60, color: "#ef4444" },  // incoming
        ];

        return (
            <motion.svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                className={className}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                style={{ cursor: "pointer", overflow: "hidden" }}
            >
                <defs>
                    <clipPath id="logoClip">
                        <rect x="0" y="0" width="100" height="100" />
                    </clipPath>
                </defs>
                
                <g clipPath="url(#logoClip)">
                    <motion.g
                        animate={isHovered ? { y: -120 } : { y: 0 }}
                        transition={
                            isHovered
                                ? {
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }
                                : {
                                    duration: 0.3,
                                    ease: "easeOut",
                                  }
                        }
                    >
                        {streamLines.map((line, i) => (
                            <rect
                                key={`stream-${i}`}
                                x={0}
                                y={line.y}
                                width={line.width}
                                height={16}
                                rx={8}
                                fill={line.color}
                            />
                        ))}
                        {/* Duplicate set for seamless loop */}
                        {streamLines.map((line, i) => (
                            <rect
                                key={`stream-dup-${i}`}
                                x={0}
                                y={line.y + 240}
                                width={line.width}
                                height={16}
                                rx={8}
                                fill={line.color}
                            />
                        ))}
                    </motion.g>
                </g>
            </motion.svg>
        );
    }

    // Pulse variant (default): lines pulse width like data flowing
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className={className}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            style={{ cursor: "pointer" }}
        >
            {lines.map((line, i) => (
                <motion.rect
                    key={i}
                    x={line.x}
                    y={line.y}
                    height={16}
                    rx={8}
                    fill={line.color}
                    initial={animated ? { width: 0, opacity: 0 } : { width: line.width, opacity: 1 }}
                    animate={
                        isHovered
                            ? {
                                width: [line.width, line.width * 0.3, line.width],
                                opacity: [1, 0.6, 1],
                              }
                            : { width: line.width, opacity: 1 }
                    }
                    transition={
                        isHovered
                            ? {
                                duration: 0.4,
                                delay: i * 0.08,
                                ease: "easeInOut",
                              }
                            : {
                                delay: animated ? line.delay : 0,
                                duration: 0.3,
                                ease: "easeOut",
                              }
                    }
                />
            ))}
        </motion.svg>
    );
}

// Compact version for navbar with text
export function FullEventLogo({ className = "", variant = "stream" }: { className?: string; variant?: "pulse" | "stream" }) {
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <LogLineLogo size={24} animated={false} variant={variant} />
            <span className="text-[17px] font-display tracking-tight text-white">
                FullEvent
            </span>
        </div>
    );
}
