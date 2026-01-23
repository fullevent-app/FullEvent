"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, Link2, Loader2, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
// import { JsonViewer } from "@/components/json-viewer"; // Removing custom component
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getRelatedEventsByTraceId } from "@/app/actions/projects";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface EventLog {
    id: string;
    projectId: string;
    type: string;
    payload: string;
    timestamp: Date;
    statusCode?: number | null;
    outcome?: string | null;
}

interface RelatedEvent {
    id: string;
    type: string;
    timestamp: Date;
    payload: string;
    statusCode?: number | null;
    outcome?: string | null;
}

interface LogDetailsPanelProps {
    log: EventLog | null;
    open: boolean;
    onClose: () => void;
    onSelectRelated?: (event: EventLog) => void;
    prefetchCache?: Map<string, { data: unknown[]; pending: boolean }>;
}

export function LogDetailsPanel({ log, open, onClose, onSelectRelated, prefetchCache }: LogDetailsPanelProps) {
    const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [expandedRelatedId, setExpandedRelatedId] = useState<string | null>(null);

    // Resizable panel state
    const [width, setWidth] = useLocalStorage("log-details-panel-width", 600);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Parse payload and extract fields
    const { parsedPayload, traceId, service } = useMemo(() => {
        if (!log) return { parsedPayload: {}, traceId: null, service: null };
        try {
            const parsed = JSON.parse(log.payload) as Record<string, unknown>;
            return {
                parsedPayload: parsed,
                traceId: (parsed.trace_id || parsed.request_id) as string | null,
                service: parsed.service as string | null,
            };
        } catch {
            return { parsedPayload: { raw: log.payload }, traceId: null, service: null };
        }
    }, [log]);

    // Fetch related events when log changes
    const fetchRelatedEvents = useCallback(async () => {
        if (!log || !traceId) {
            setRelatedEvents([]);
            return;
        }

        // Check prefetch cache first
        const cacheKey = `${log.id}:${traceId}`;
        const cached = prefetchCache?.get(cacheKey);

        if (cached && !cached.pending && cached.data.length > 0) {
            console.log(`[TIMING] Using prefetched data for ${cacheKey}`);
            setRelatedEvents(cached.data as RelatedEvent[]);
            setRelatedLoading(false);
            return;
        }

        setRelatedLoading(true);
        setRelatedEvents([]);
        // Reset expanded state when log changes
        setExpandedRelatedId(null);
        try {
            const events = await getRelatedEventsByTraceId(log.projectId, log.id, traceId);
            setRelatedEvents(events);
        } catch (err) {
            console.error("Failed to fetch related events:", err);
            setRelatedEvents([]);
        } finally {
            setRelatedLoading(false);
        }
    }, [log, traceId, prefetchCache]);

    useEffect(() => {
        fetchRelatedEvents();
    }, [fetchRelatedEvents]);

    // Resize handlers
    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            // Calculate new width: Window Width - Mouse X (since panel is on the right)
            // But actually, simpler logic is: previous width + delta, but MouseEvent gives absolute position.
            // Since panel is anchored right, Width = Window Width - e.clientX
            const newWidth = window.innerWidth - e.clientX;

            // Constrain width
            if (newWidth > 300 && newWidth < 1200) {
                setWidth(newWidth);
            }
        }
    }, [isResizing, setWidth]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);


    if (!open || !log) return null;

    const handleGoToRelated = (e: React.MouseEvent, related: RelatedEvent) => {
        e.stopPropagation();
        if (onSelectRelated) {
            onSelectRelated({
                ...related,
                projectId: log.projectId,
            });
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedRelatedId(current => current === id ? null : id);
    };

    // Custom style for the highlighter to blend with our UI
    const customStyle = {
        ...vscDarkPlus,
        'pre[class*="language-"]': {
            ...vscDarkPlus['pre[class*="language-"]'],
            background: 'transparent',
            margin: 0,
            padding: 0,
            fontSize: 'inherit',
        },
        'code[class*="language-"]': {
            ...vscDarkPlus['code[class*="language-"]'],
            fontSize: 'inherit',
        }
    };

    return (
        <div
            ref={sidebarRef}
            className="border-l border-zinc-800 bg-zinc-950 flex flex-col h-full shrink-0 transition-none shadow-2xl relative"
            style={{ width: `${width}px` }}
        >
            {/* Resize Handle */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 z-50 group"
                onMouseDown={startResizing}
            >
                {/* Visual Grab Handle (Rectangular) */}
                <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-4 h-8 bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-col-resize group-hover:bg-zinc-700">
                    <div className="w-0.5 h-4 bg-zinc-500/50 gap-0.5 flex flex-col"></div>
                    <div className="w-0.5 h-4 bg-zinc-500/50 ml-0.5"></div>
                </div>
            </div>

            {/* Overlay during resize to prevent text selection/stuttering */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-col-resize select-none" />
            )}

            <div className="p-6 border-b border-zinc-900 flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 font-mono rounded-none">
                            {log.type}
                        </Badge>
                        {service && (
                            <Badge variant="outline" className="text-purple-400 border-purple-500/20 bg-purple-500/10 font-mono text-xs rounded-none">
                                {service}
                            </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">
                            {new Date(log.timestamp).toISOString()}
                        </span>
                    </div>
                    <h3 className="text-lg font-mono font-bold truncate select-all text-zinc-100">
                        {log.id}
                    </h3>
                    {traceId && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                            <Link2 className="h-3 w-3" />
                            <span className="font-mono">trace: {traceId.substring(0, 18)}...</span>
                            {relatedLoading && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-400/70 ml-2 animate-pulse">
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    Scanning
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white rounded-none">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                        {/* Related Events Section */}
                        {relatedEvents.length > 0 && (
                            <div className="border border-blue-500/20 bg-blue-500/5 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Link2 className="h-4 w-4 text-blue-400" />
                                    <span className="text-sm font-semibold text-blue-300">
                                        Related Events
                                    </span>
                                    {relatedLoading && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
                                </div>

                                <div className="space-y-0 border border-zinc-800">
                                    <div className="bg-zinc-900/50 px-3 py-2 border-b border-zinc-800">
                                        <p className="text-xs text-blue-400/70">
                                            {relatedEvents.length} events in this distributed trace
                                        </p>
                                    </div>
                                    {relatedEvents.map((related) => {
                                        let relatedPayload: Record<string, unknown> = {};
                                        try {
                                            relatedPayload = JSON.parse(related.payload);
                                        } catch { /* ignore */ }

                                        const relatedService = relatedPayload.service as string | undefined;
                                        const statusCode = related.statusCode ?? relatedPayload.status_code;
                                        const isExpanded = expandedRelatedId === related.id;

                                        return (
                                            <div key={related.id} className="border-b border-zinc-800 last:border-0 bg-zinc-900/30">
                                                <div
                                                    onClick={() => toggleExpand(related.id)}
                                                    className="w-full text-left p-3 hover:bg-zinc-900 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-3 w-3 text-zinc-500" />
                                                        ) : (
                                                            <ChevronRight className="h-3 w-3 text-zinc-500" />
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs font-mono rounded-none ${related.outcome === 'error' || (statusCode && Number(statusCode) >= 400)
                                                                    ? 'text-red-400 border-red-500/20 bg-red-500/10'
                                                                    : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                                                                    }`}
                                                            >
                                                                {related.type}
                                                            </Badge>
                                                            {relatedService && (
                                                                <span className="text-xs text-purple-400 font-mono">
                                                                    {relatedService}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {statusCode != null && (
                                                            <span className={`text-xs font-mono ${Number(statusCode) >= 400 ? 'text-red-400' : 'text-zinc-500'
                                                                }`}>
                                                                {String(statusCode)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-zinc-500 font-mono">
                                                            {new Date(related.timestamp).toLocaleTimeString()}
                                                        </span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 text-zinc-400 hover:text-blue-400"
                                                            onClick={(e) => handleGoToRelated(e, related)}
                                                            title="View full event details"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="px-3 pb-3 pt-0 border-t border-zinc-800/50 bg-zinc-950/30">
                                                        <div className="mt-2 text-xs overflow-x-auto p-2 border border-zinc-800 bg-zinc-950/50 text-xs">
                                                            <SyntaxHighlighter
                                                                language="json"
                                                                style={customStyle}
                                                                wrapLongLines={true}
                                                            >
                                                                {JSON.stringify(relatedPayload, null, 2)}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Event Payload */}
                        <div className="border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-sm">
                            <SyntaxHighlighter
                                language="json"
                                style={customStyle}
                                wrapLongLines={true}
                            >
                                {JSON.stringify(parsedPayload, null, 2)}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
