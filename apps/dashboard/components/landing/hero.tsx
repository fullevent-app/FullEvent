"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useMemo } from "react";

// Sample log data that will scroll infinitely in background
const sampleLogs = [
    { timestamp: "2024-12-20T03:14:22.912Z", level: "debug", message: "PostgreSQL connection pool initialized host=db.internal:5432 database=main pool_size=20 ssl_mode=require" },
    { timestamp: "2024-12-20T03:14:23.156Z", level: "INFO", message: "Incoming request method=GET path=/api/v1/users/me ip=192.168.1.42 user_agent=\"Mozilla/5.0\" request_id=req_8f7a2b3c" },
    { timestamp: "2024-12-20T03:14:23.201Z", level: "debug", message: "JWT token validation started issuer=auth.company.com audience=api.company.com exp=1703044800 sub=user_abc123" },
    { timestamp: "2024-12-20T03:14:23.445Z", level: "WARN", message: "Slow database query detected duration_ms=847 query=\"SELECT u.*, o.name FROM users u JOIN orgs o ON u.org_id = o.id WHERE u.org_id = $1\"" },
    { timestamp: "2024-12-20T03:14:23.892Z", level: "debug", message: "Redis cache lookup failed key=users:org_12345:list:v2 ttl_seconds=3600 fallback_strategy=database cache_cluster=redis-prod-01" },
    { timestamp: "2024-12-20T03:14:24.156Z", level: "info", message: "Request completed successfully status=200 duration_ms=1247 bytes_sent=48291 request_id=req_8f7a2b3c cache_hit=false" },
    { timestamp: "2024-12-20T03:14:24.312Z", level: "ERROR", message: "Database connection pool exhausted active_connections=20 waiting_requests=147 timeout_ms=30000 service=postgres" },
    { timestamp: "2024-12-20T03:14:24.445Z", level: "warn", message: "Retrying failed HTTP request attempt=3 max_attempts=5 backoff_ms=100 error_code=ETIMEDOUT target_service=payment-gateway" },
    { timestamp: "2024-12-20T03:14:25.112Z", level: "INFO", message: "Circuit breaker state transition service=payment-api previous_state=closed current_state=open failure_count=5 failure_threshold=5" },
    { timestamp: "2024-12-20T03:14:25.445Z", level: "debug", message: "Background job executed successfully job_id=job_9x8w7v6u type=weekly_email_digest duration_ms=2341 emails_sent=1847" },
    { timestamp: "2024-12-20T03:14:26.201Z", level: "ERROR", message: "Memory pressure critical heap_used_bytes=1932735283 heap_limit_bytes=2147483648 gc_pause_ms=847 gc_type=major" },
    { timestamp: "2024-12-20T03:14:26.556Z", level: "WARN", message: "Rate limit threshold approaching user_id=user_abc123 current_requests=890 limit=1000 window_seconds=60 remaining=110" },
    { timestamp: "2024-12-20T03:14:27.112Z", level: "info", message: "WebSocket connection established client_id=ws_7f8g9h2j protocol=wss rooms=[\"team_updates\",\"notifications\"] user_id=user_abc123" },
    { timestamp: "2024-12-20T03:14:27.445Z", level: "debug", message: "Kafka message consumed successfully topic=user-events partition=3 offset=1847291 key=user_abc123 consumer_group=api-consumers" },
    { timestamp: "2024-12-20T03:14:28.112Z", level: "INFO", message: "Health check passed service=api-gateway uptime_seconds=847291 active_connections=142 memory_usage_percent=73 cpu_usage_percent=45" },
    { timestamp: "2024-12-20T03:14:28.556Z", level: "debug", message: "S3 upload completed bucket=company-uploads key=avatars/user_abc123/profile.jpg size_bytes=245891 content_type=image/jpeg" },
    { timestamp: "2024-12-20T03:14:29.112Z", level: "warn", message: "Deprecated API version detected endpoint=/api/v1/legacy/users version=v1 recommended_version=v3 deprecation_date=2025-01-15" },
    { timestamp: "2024-12-20T03:14:29.556Z", level: "info", message: "User session created session_id=sess_abc123xyz user_id=user_abc123 ip=192.168.1.42 user_agent=\"Chrome/120.0\"" },
    { timestamp: "2024-12-20T03:14:30.112Z", level: "ERROR", message: "Payment processing failed transaction_id=txn_xyz789 error_code=CARD_DECLINED amount_cents=4999 currency=USD retry_eligible=false" },
    { timestamp: "2024-12-20T03:14:30.556Z", level: "debug", message: "GraphQL query executed operation=GetUserProfile complexity_score=23 max_depth=4 duration_ms=156 cache_status=miss" },
];

// Get color for log level
function getLevelColor(level: string): string {
    const l = level.toLowerCase();
    if (l === "error") return "text-red-500/40";
    if (l === "warn") return "text-yellow-500/40";
    if (l === "info") return "text-cyan-500/40";
    if (l === "debug") return "text-zinc-500/30";
    return "text-zinc-500/30";
}

// Scrolling logs background
function ScrollingLogs() {
    const shuffledLogs = useMemo(() => {
        const logs1 = [...sampleLogs].sort(() => Math.random() - 0.5);
        const logs2 = [...sampleLogs].sort(() => Math.random() - 0.5);
        const logs3 = [...sampleLogs].sort(() => Math.random() - 0.5);
        return [...logs1, ...logs2, ...logs3, ...logs1, ...logs2, ...logs3];
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
            <motion.div
                className="flex flex-col gap-[6px] font-mono text-[11px] leading-relaxed whitespace-nowrap w-full"
                initial={{ y: "0%" }}
                animate={{ y: "-50%" }}
                transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: "linear",
                }}
            >
                {shuffledLogs.map((log, i) => (
                    <div key={i} className="flex gap-3 px-4">
                        <span className="text-zinc-600/40">{log.timestamp}</span>
                        <span className={`uppercase font-semibold min-w-[50px] ${getLevelColor(log.level)}`}>
                            {log.level}
                        </span>
                        <span className="text-zinc-500/30">{log.message}</span>
                    </div>
                ))}
            </motion.div>

            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#050507] via-[#050507]/80 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent z-10" />
        </div>
    );
}

// Animated stars background
function StarField() {
    const stars = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
    }));

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                    }}
                    animate={{
                        opacity: [0.1, 0.5, 0.1],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: star.duration,
                        delay: star.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

// JSON output preview matching the code block - showing Wide Event structure
function JsonPreview() {
    return (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] overflow-hidden shadow-2xl h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                        <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                        <div className="h-3 w-3 rounded-full bg-[#28ca41]" />
                    </div>
                    <span className="text-xs font-mono text-zinc-500">wide_event.json</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Stored
                    </span>
                </div>
            </div>

            {/* JSON content - Wide Event structure */}
            <div className="p-5 text-left overflow-x-auto">
                <pre className="font-mono text-[12px] leading-relaxed">
                    <code>
                        <span className="text-white">{"{"}</span>{"\n"}
                        <span className="text-zinc-500">{"  // Auto-captured by middleware"}</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"method"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#98c379]">"POST"</span>
                        <span className="text-white">,</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"path"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#98c379]">"/api/checkout"</span>
                        <span className="text-white">,</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"status_code"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#d19a66]">200</span>
                        <span className="text-white">,</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"duration_ms"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#d19a66]">847</span>
                        <span className="text-white">,</span>{"\n"}
                        <span className="text-zinc-500">{"  // Your business context"}</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"user"</span>
                        <span className="text-white">: {"{ "}</span>
                        <span className="text-[#e06c75]">"id"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#98c379]">"usr_42"</span>
                        <span className="text-white">, </span>
                        <span className="text-[#e06c75]">"plan"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#98c379]">"premium"</span>
                        <span className="text-white">{" }"}</span>
                        <span className="text-white">,</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"cart"</span>
                        <span className="text-white">: {"{ "}</span>
                        <span className="text-[#e06c75]">"total_cents"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#d19a66]">15999</span>
                        <span className="text-white">, </span>
                        <span className="text-[#e06c75]">"items"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#d19a66]">3</span>
                        <span className="text-white">{" }"}</span>
                        <span className="text-white">,</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">"payment"</span>
                        <span className="text-white">: {"{ "}</span>
                        <span className="text-[#e06c75]">"provider"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#98c379]">"stripe"</span>
                        <span className="text-white">, </span>
                        <span className="text-[#e06c75]">"latency_ms"</span>
                        <span className="text-white">: </span>
                        <span className="text-[#d19a66]">234</span>
                        <span className="text-white">{" }"}</span>{"\n"}
                        <span className="text-white">{"}"}</span>
                    </code>
                </pre>
            </div>
        </div>
    );
}

// Code block component - showing Wide Event pattern
function CodeBlock() {
    return (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] overflow-hidden shadow-2xl h-full">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28ca41]" />
                </div>
                <div className="ml-4 text-xs font-mono text-zinc-500">checkout.ts</div>
            </div>

            {/* Code content - Wide Event enrichment pattern */}
            <div className="p-5 text-left overflow-x-auto">
                <pre className="font-mono text-[12px] leading-relaxed">
                    <code>
                        <span className="text-zinc-500">{"// Enrich the wide event with context"}</span>{"\n"}
                        <span className="text-[#c678dd]">const</span>
                        <span className="text-white"> event = </span>
                        <span className="text-[#e5c07b]">c</span>
                        <span className="text-white">.</span>
                        <span className="text-[#61afef]">get</span>
                        <span className="text-white">(</span>
                        <span className="text-[#98c379]">'wideEvent'</span>
                        <span className="text-white">);</span>{"\n\n"}

                        <span className="text-zinc-500">{"// Add user context"}</span>{"\n"}
                        <span className="text-[#e5c07b]">event</span>
                        <span className="text-white">.</span>
                        <span className="text-[#e06c75]">user</span>
                        <span className="text-white"> = {"{ "}</span>
                        <span className="text-[#e06c75]">id</span>
                        <span className="text-white">: user.id, </span>
                        <span className="text-[#e06c75]">plan</span>
                        <span className="text-white">: user.plan {"}"};</span>{"\n\n"}

                        <span className="text-zinc-500">{"// Add cart details"}</span>{"\n"}
                        <span className="text-[#e5c07b]">event</span>
                        <span className="text-white">.</span>
                        <span className="text-[#e06c75]">cart</span>
                        <span className="text-white"> = {"{"}</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">total_cents</span>
                        <span className="text-white">: cart.total,</span>{"\n"}
                        <span className="text-white">{"  "}</span>
                        <span className="text-[#e06c75]">items</span>
                        <span className="text-white">: cart.items.</span>
                        <span className="text-[#e06c75]">length</span>{"\n"}
                        <span className="text-white">{"}"};</span>{"\n\n"}

                        <span className="text-zinc-500">{"// Add payment timing"}</span>{"\n"}
                        <span className="text-[#e5c07b]">event</span>
                        <span className="text-white">.</span>
                        <span className="text-[#e06c75]">payment</span>
                        <span className="text-white"> = {"{ "}</span>
                        <span className="text-[#e06c75]">provider</span>
                        <span className="text-white">, </span>
                        <span className="text-[#e06c75]">latency_ms</span>
                        <span className="text-white"> {"}"};</span>
                    </code>
                </pre>
            </div>
        </div>
    );
}

export function Hero() {
    return (
        <div className="relative z-10 min-h-screen flex items-center justify-center overflow-hidden cosmic-bg bg-[#050507]">
            {/* Aurora layers */}
            <div className="aurora-layer aurora-cyan" />
            <div className="aurora-layer aurora-orange" />
            <div className="aurora-layer aurora-magenta" />

            {/* Scrolling logs background */}
            <ScrollingLogs />

            {/* Star field */}
            <StarField />

            {/* Main content */}
            <div className="container px-6 relative z-10 pt-24 pb-32">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm"
                    >
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm text-zinc-300 font-medium tracking-wide">
                            The answer is 42. The question is your data.
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display tracking-tight text-white mb-8 leading-[1.1]"
                    >
                        <span className="block">Don&apos;t Panic.</span>
                        <span className="block mt-2 shimmer-text">Just Query.</span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl leading-relaxed font-sans"
                    >
                        The infinite improbability event analytics platform.
                        <br className="hidden sm:block" />
                        <span className="text-zinc-500">Ingest everything. Query anything. Towel not included.</span>
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16 w-full"
                    >
                        <Button
                            size="lg"
                            className="h-14 text-base bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-semibold btn-glow-cyan border-0 rounded-xl w-full justify-center"
                        >
                            Start Exploring the Galaxy
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 text-base border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm rounded-xl font-mono w-full justify-center"
                        >
                            <span className="text-zinc-400 mr-2">$</span>
                            npx fullevent init
                        </Button>
                    </motion.div>

                    {/* Code → JSON Demo */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.8 }}
                        className="w-full"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Code Block */}
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 text-center font-mono">
                                    Your Code
                                </span>
                                <CodeBlock />
                            </div>

                            {/* JSON Output */}
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-3 text-center font-mono">
                                    Stored Event
                                </span>
                                <JsonPreview />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent pointer-events-none" />
        </div>
    );
}
