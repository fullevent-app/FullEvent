"use client";

import { Search, X } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";

// Sample events data for the search demo - organized by filter scenario
const allEvents = [
    // status:500 results (8 unique)
    { id: 1, timestamp: "10:24:15", status: 500, method: "POST", path: "/api/payment", duration: "1205ms", type: "payment.failed", user: "usr_9m3p1" },
    { id: 2, timestamp: "10:31:02", status: 500, method: "POST", path: "/api/checkout", duration: "3201ms", type: "checkout.timeout", user: "usr_4k2m8" },
    { id: 3, timestamp: "10:35:18", status: 500, method: "POST", path: "/api/inventory", duration: "892ms", type: "inventory.sync_failed", user: "usr_7n3p2" },
    { id: 4, timestamp: "10:42:33", status: 500, method: "POST", path: "/api/webhook", duration: "5012ms", type: "webhook.timeout", user: "usr_1x9k4" },
    { id: 5, timestamp: "10:48:55", status: 500, method: "POST", path: "/api/payment", duration: "2105ms", type: "payment.gateway_error", user: "usr_8m2j6" },
    { id: 6, timestamp: "10:52:11", status: 500, method: "POST", path: "/api/orders", duration: "1543ms", type: "order.create_failed", user: "usr_3p7k1" },
    { id: 7, timestamp: "10:58:29", status: 500, method: "POST", path: "/api/shipping", duration: "4201ms", type: "shipping.rate_error", user: "usr_6n4m9" },
    { id: 8, timestamp: "11:03:44", status: 500, method: "POST", path: "/api/email", duration: "1876ms", type: "email.send_failed", user: "usr_2k8j5" },

    // type:checkout.completed results (8 unique)
    { id: 9, timestamp: "10:23:43", status: 200, method: "POST", path: "/api/checkout", duration: "2418ms", type: "checkout.completed", user: "usr_8x7k2" },
    { id: 10, timestamp: "10:24:22", status: 200, method: "POST", path: "/api/checkout", duration: "2102ms", type: "checkout.completed", user: "usr_9m3p1" },
    { id: 11, timestamp: "10:26:01", status: 200, method: "POST", path: "/api/checkout", duration: "2567ms", type: "checkout.completed", user: "usr_5n2m8" },
    { id: 12, timestamp: "10:26:48", status: 200, method: "POST", path: "/api/checkout", duration: "1987ms", type: "checkout.completed", user: "usr_7p4q9" },
    { id: 13, timestamp: "10:33:15", status: 200, method: "POST", path: "/api/checkout", duration: "1845ms", type: "checkout.completed", user: "usr_2m4k7" },
    { id: 14, timestamp: "10:39:28", status: 200, method: "POST", path: "/api/checkout", duration: "2234ms", type: "checkout.completed", user: "usr_6j9n3" },
    { id: 15, timestamp: "10:45:52", status: 200, method: "POST", path: "/api/checkout", duration: "1654ms", type: "checkout.completed", user: "usr_4p1m8" },
    { id: 16, timestamp: "10:51:07", status: 200, method: "POST", path: "/api/checkout", duration: "2891ms", type: "checkout.completed", user: "usr_9k3j2" },

    // user:usr_9m3p1 + status:200 results (8 unique)
    { id: 17, timestamp: "10:24:18", status: 200, method: "POST", path: "/api/payment", duration: "892ms", type: "payment.retry", user: "usr_9m3p1" },
    { id: 18, timestamp: "10:24:19", status: 200, method: "GET", path: "/api/cart", duration: "45ms", type: "cart.fetch", user: "usr_9m3p1" },
    { id: 19, timestamp: "10:24:20", status: 200, method: "POST", path: "/api/address", duration: "123ms", type: "address.validate", user: "usr_9m3p1" },
    { id: 20, timestamp: "10:24:21", status: 200, method: "GET", path: "/api/shipping", duration: "234ms", type: "shipping.rates", user: "usr_9m3p1" },
    { id: 21, timestamp: "10:24:22", status: 200, method: "POST", path: "/api/checkout", duration: "2102ms", type: "checkout.completed", user: "usr_9m3p1" },
    { id: 22, timestamp: "10:24:23", status: 200, method: "POST", path: "/api/email", duration: "156ms", type: "email.confirmation", user: "usr_9m3p1" },
    { id: 23, timestamp: "10:24:24", status: 200, method: "POST", path: "/api/analytics", duration: "34ms", type: "analytics.track", user: "usr_9m3p1" },
    { id: 24, timestamp: "10:24:25", status: 200, method: "GET", path: "/api/orders", duration: "89ms", type: "orders.fetch", user: "usr_9m3p1" },

    // method:POST + type:payment.failed results (8 unique)
    { id: 25, timestamp: "10:24:15", status: 500, method: "POST", path: "/api/payment", duration: "1205ms", type: "payment.failed", user: "usr_9m3p1" },
    { id: 26, timestamp: "10:29:33", status: 400, method: "POST", path: "/api/payment", duration: "234ms", type: "payment.failed", user: "usr_3k7m2" },
    { id: 27, timestamp: "10:34:48", status: 500, method: "POST", path: "/api/payment", duration: "3421ms", type: "payment.failed", user: "usr_8n2j5" },
    { id: 28, timestamp: "10:41:12", status: 402, method: "POST", path: "/api/payment", duration: "189ms", type: "payment.failed", user: "usr_1p4k9" },
    { id: 29, timestamp: "10:47:29", status: 500, method: "POST", path: "/api/payment", duration: "2876ms", type: "payment.failed", user: "usr_5m8n3" },
    { id: 30, timestamp: "10:53:44", status: 400, method: "POST", path: "/api/payment", duration: "145ms", type: "payment.failed", user: "usr_7k2j6" },
    { id: 31, timestamp: "10:59:58", status: 500, method: "POST", path: "/api/payment", duration: "4102ms", type: "payment.failed", user: "usr_2n9m4" },
    { id: 32, timestamp: "11:05:15", status: 402, method: "POST", path: "/api/payment", duration: "267ms", type: "payment.failed", user: "usr_6p3k8" },
];

// Search sequences to demo - supports multiple filters
const searchSequences = [
    { filters: [{ key: "status", value: "500" }] },
    { filters: [{ key: "type", value: "checkout.completed" }] },
    { filters: [{ key: "user", value: "usr_9m3p1" }, { key: "status", value: "200" }] },
    { filters: [{ key: "method", value: "POST" }, { key: "type", value: "payment.failed" }] },
];

function getStatusStyle(status: number) {
    if (status >= 500) return "text-red-500 bg-red-500/10";
    if (status >= 400) return "text-amber-500 bg-amber-500/10";
    return "text-emerald-500 bg-emerald-500/10";
}

interface FilterChip {
    key: string;
    value: string;
}

function filterEvents(filters: FilterChip[]) {
    if (filters.length === 0) return allEvents.slice(0, 8);

    return allEvents.filter(event => {
        return filters.every(filter => {
            if (filter.key === "status") return event.status.toString() === filter.value;
            if (filter.key === "type") return event.type === filter.value;
            if (filter.key === "user") return event.user === filter.value;
            if (filter.key === "method") return event.method === filter.value;
            return true;
        });
    });
}

function SearchDemo() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const [activeFilters, setActiveFilters] = useState<FilterChip[]>([]);
    const [typingFilter, setTypingFilter] = useState<{ key: string; value: string } | null>(null);
    const [searchTime, setSearchTime] = useState<number | null>(null);

    const filteredEvents = filterEvents(activeFilters);

    // Typing animation effect
    useEffect(() => {
        if (!isInView) return;

        let currentSeqIdx = 0;
        let timeoutId: NodeJS.Timeout;
        let intervalId: NodeJS.Timeout;

        const typeFilter = (filter: FilterChip, onComplete: () => void) => {
            const fullText = `${filter.key}:${filter.value}`;
            let charIdx = 0;

            intervalId = setInterval(() => {
                if (charIdx <= fullText.length) {
                    const typed = fullText.slice(0, charIdx);
                    if (typed.includes(":")) {
                        const [key, val] = typed.split(":");
                        setTypingFilter({ key, value: val || "" });
                    } else {
                        setTypingFilter({ key: typed, value: "" });
                    }
                    charIdx++;
                } else {
                    clearInterval(intervalId);
                    setTypingFilter(null);
                    setActiveFilters(prev => [...prev, filter]);
                    onComplete();
                }
            }, 100);
        };

        const runSequence = () => {
            const seq = searchSequences[currentSeqIdx];

            // Clear previous
            setActiveFilters([]);
            setTypingFilter(null);
            setSearchTime(null);

            // Type each filter in sequence
            let filterIdx = 0;

            const typeNextFilter = () => {
                if (filterIdx >= seq.filters.length) {
                    // All filters typed, show search time
                    setSearchTime(Math.floor(Math.random() * 15) + 8);

                    // Wait then move to next sequence
                    timeoutId = setTimeout(() => {
                        currentSeqIdx = (currentSeqIdx + 1) % searchSequences.length;
                        runSequence();
                    }, 3000);
                    return;
                }

                const filter = seq.filters[filterIdx];
                typeFilter(filter, () => {
                    filterIdx++;
                    // Small pause between filters
                    timeoutId = setTimeout(typeNextFilter, 400);
                });
            };

            // Start typing after a brief pause
            timeoutId = setTimeout(typeNextFilter, 500);
        };

        timeoutId = setTimeout(runSequence, 800);

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [isInView]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full"
        >
            {/* Search Demo Container */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0f] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                            <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                            <div className="h-3 w-3 rounded-full bg-[#28ca41]" />
                        </div>
                        <span className="text-xs font-mono text-zinc-500">FullEvent Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {searchTime !== null && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-[10px] font-mono text-emerald-400"
                            >
                                {searchTime}ms
                            </motion.span>
                        )}
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>

                {/* Search Input */}
                <div className="px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 px-3 py-2 rounded-none h-10">
                        <Search className="h-4 w-4 text-zinc-500 shrink-0" />

                        {/* Completed filter chips */}
                        {activeFilters.map((filter, idx) => (
                            <div
                                key={`${filter.key}-${idx}`}
                                className="flex items-center gap-0.5 bg-zinc-800 px-2 py-0.5 text-xs shrink-0"
                            >
                                <span className="text-zinc-400">{filter.key}:</span>
                                <span className="text-zinc-100">{filter.value}</span>
                            </div>
                        ))}

                        {/* Currently typing filter */}
                        {typingFilter && (
                            <div className="flex items-center gap-0.5 bg-zinc-800/50 px-2 py-0.5 text-xs shrink-0 border border-zinc-700">
                                <span className="text-zinc-400">{typingFilter.key}{typingFilter.value ? ":" : ""}</span>
                                {typingFilter.value && <span className="text-zinc-100">{typingFilter.value}</span>}
                                <span className="animate-pulse text-cyan-400">|</span>
                            </div>
                        )}

                        <div className="flex-1 text-sm text-zinc-400 font-mono">
                            {activeFilters.length === 0 && !typingFilter && (
                                <span className="text-zinc-600">Type a filter or search...</span>
                            )}
                        </div>

                        {(activeFilters.length > 0 || typingFilter) && (
                            <X className="h-3 w-3 text-zinc-600" />
                        )}
                    </div>
                </div>

                {/* Table Header */}
                <div className="flex text-[10px] text-zinc-500 font-medium px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                    <div className="w-[80px] shrink-0">Timestamp</div>
                    <div className="w-[60px] shrink-0">Status</div>
                    <div className="w-[60px] shrink-0">Method</div>
                    <div className="w-[140px] shrink-0">Path</div>
                    <div className="w-[70px] shrink-0 text-right">Duration</div>
                    <div className="w-[100px] shrink-0 pl-4">User</div>
                    <div className="flex-1 pl-4">Event Type</div>
                </div>

                {/* Table Body - Fixed height */}
                <div className="h-[296px] overflow-hidden">
                    <div className="divide-y divide-white/[0.03]">
                        {filteredEvents.slice(0, 8).map((event, idx) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15, delay: idx * 0.02 }}
                                className="flex items-center px-4 py-2.5 text-[11px] font-mono hover:bg-white/[0.02] transition-colors h-[37px]"
                            >
                                <div className="w-[80px] shrink-0 text-zinc-500 tabular-nums">
                                    {event.timestamp}
                                </div>
                                <div className="w-[60px] shrink-0">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyle(event.status)}`}>
                                        {event.status}
                                    </span>
                                </div>
                                <div className="w-[60px] shrink-0 text-white font-semibold">
                                    {event.method}
                                </div>
                                <div className="w-[140px] shrink-0 text-zinc-400 truncate">
                                    {event.path}
                                </div>
                                <div className="w-[70px] shrink-0 text-right text-zinc-500 tabular-nums">
                                    {event.duration}
                                </div>
                                <div className="w-[100px] shrink-0 pl-4 text-zinc-500 truncate">
                                    {event.user}
                                </div>
                                <div className="flex-1 pl-4 text-cyan-400/80 truncate">
                                    {event.type}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
                    <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                        <span>
                            {activeFilters.length > 0
                                ? `${(filteredEvents.length * 8472).toLocaleString()} of 427,839 events`
                                : "427,839 events"
                            }
                        </span>
                        <span className="text-zinc-500">Powered by FullEvent</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export function FeaturesGrid() {
    return (
        <section className="relative py-32 overflow-hidden">
            {/* Background */}
            {/* <div className="absolute inset-0 bg-[#050507]" /> Removed for global spark effect */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050507] to-transparent pointer-events-none z-10" />


            <div className="container px-6 mx-auto relative z-10 max-w-5xl">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mb-12 text-center"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-display text-white mb-6 tracking-tight leading-[1.1]">
                        Search at the speed of light.
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-400 leading-relaxed font-sans max-w-2xl mx-auto">
                        Query millions of events in milliseconds. Filter by any field.
                        Find the needle in your data haystack instantly.
                    </p>
                </motion.div>

                {/* Search Demo */}
                <SearchDemo />

                {/* Bottom quote */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="mt-20 text-center"
                >
                    <blockquote className="text-xl md:text-2xl font-display text-zinc-500 italic">
                        &ldquo;Time is an illusion. Query time doubly so.&rdquo;
                    </blockquote>
                    <p className="mt-4 text-sm text-zinc-600 font-mono">— FullEvent Engineers</p>
                </motion.div>
            </div>
        </section>
    );
}
