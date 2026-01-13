"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { getProjects, getProjectEvents, trackLogsView, getProjectSearchSuggestions, getProjectStats } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Terminal, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
    params: Promise<{ projectId: string }>;
}

interface Project {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

interface EventLog {
    id: string;
    projectId: string;
    type: string;
    payload: string;
    timestamp: Date;
    statusCode?: number | null;
    outcome?: string | null;
}

import { LogDetailsPanel } from "./log-details-panel";
import { LogStats, type ProjectStats } from "@/components/log-stats";
import { LogSearchInput, ParsedQuery, SearchSuggestions } from "@/components/log-search-input";

export default function ProjectLogsPage({ params }: PageProps) {
    const { projectId } = use(params);

    const [project, setProject] = useState<Project | null>(null);
    const [events, setEvents] = useState<EventLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<EventLog | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestions | undefined>(undefined);
    const [stats, setStats] = useState<ProjectStats | undefined>(undefined);
    const [statsLoading, setStatsLoading] = useState(true);
    const queryParamsRef = useRef<Record<string, unknown>>({});
    const eventsRef = useRef<EventLog[]>([]);
    const observerTarget = useRef(null);

    const LIMIT = 100;

    const loadStats = useCallback(async (params: Record<string, unknown> = {}) => {
        setStatsLoading(true);
        try {
            const statsData = await getProjectStats(projectId, params as { search?: string;[key: string]: string | number | undefined });
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load stats:", error);
        } finally {
            setStatsLoading(false);
        }
    }, [projectId]);

    const loadEvents = useCallback(async (params: Record<string, unknown> = {}, append = false) => {
        setEventsLoading(true);
        try {
            const currentOffset = append ? eventsRef.current.length : 0;

            const filterOptions = {
                ...queryParamsRef.current,
                ...params,
                limit: LIMIT,
                offset: currentOffset
            };

            const data = await getProjectEvents(projectId, filterOptions as { search?: string; limit?: number;[key: string]: string | number | undefined });

            if (!data || data.length < LIMIT) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (append) {
                setEvents(prev => {
                    const next = [...prev, ...(data || [])];
                    eventsRef.current = next;
                    return next;
                });
            } else {
                const next = data || [];
                setEvents(next);
                eventsRef.current = next;
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load events");
        } finally {
            setEventsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        const init = async () => {
            await loadProject();
            await loadEvents({}, false);
            await loadStats({});
            await trackLogsView(projectId);
            // Load dynamic search suggestions from actual log data
            try {
                const suggestions = await getProjectSearchSuggestions(projectId);
                setSearchSuggestions(suggestions);
            } catch (err) {
                console.error("Failed to load search suggestions:", err);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !eventsLoading) {
                    loadEvents({}, true);
                }
            },
            { rootMargin: "200px", threshold: 0 }
        );

        const target = observerTarget.current;
        if (target) {
            observer.observe(target);
        }

        return () => {
            if (target) {
                observer.unobserve(target);
            }
        };
    }, [hasMore, eventsLoading, loadEvents]);

    const loadProject = async () => {
        try {
            const projects = await getProjects() as Project[];
            const p = projects.find((p) => p.id === projectId);
            if (p) {
                setProject(p);
            } else {
                toast.error("Project not found");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load project details");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = useCallback((raw: string, parsed: ParsedQuery) => {
        // Only search if there are actual filter values or search text
        // Don't trigger on incomplete filters like "status:" with no value
        const hasFilters = Object.keys(parsed).some(key => {
            if (key === 'search') return parsed.search && parsed.search.trim().length > 0;
            return parsed[key] !== undefined && parsed[key] !== '';
        });

        // If no filters and no search, load all
        const params = hasFilters ? { ...parsed } : {};

        queryParamsRef.current = params;
        loadEvents(params, false);
        loadStats(params);
    }, [loadEvents, loadStats]);

    const handleRefresh = () => {
        loadEvents({}, false);
        loadStats(queryParamsRef.current);
    };

    if (loading) return <div className="p-8">Loading project details...</div>;

    if (!project) {
        return (
            <div className="p-8 text-center space-y-4">
                <h2 className="text-xl font-bold">Project not found</h2>
                <Button asChild variant="outline">
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background">
            <div className="flex-none p-6 border-b border-border bg-muted/20">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link href="/dashboard">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                            <p className="text-muted-foreground text-sm">Event logs & analytics</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={eventsLoading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <LogStats stats={stats} loading={statsLoading && !stats} />

                <div className="mt-2">
                    <LogSearchInput onSearch={handleSearch} isLoading={eventsLoading} dynamicSuggestions={searchSuggestions} />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        {eventsLoading && events.length === 0 ? (
                            <div className="mt-20 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 p-8">
                                <Terminal className="h-12 w-12 mx-auto opacity-20" />
                                <p>No events found matching your criteria.</p>
                            </div>
                        ) : (
                            <div className="min-w-[800px]">
                                <div className="sticky top-0 z-10 flex bg-muted/40 backdrop-blur-sm border-b border-border px-4 py-2 text-muted-foreground font-medium select-none text-xs">
                                    <div className="w-[100px] shrink-0">Timestamp</div>
                                    <div className="w-[80px] shrink-0">Status</div>
                                    <div className="w-[80px] shrink-0">Method</div>
                                    <div className="w-[250px] shrink-0">Path</div>
                                    <div className="w-[80px] shrink-0 text-right pr-4">Duration</div>
                                    <div className="w-[100px] shrink-0">Env</div>
                                    <div>Payload</div>
                                </div>
                                <div className="divide-y divide-border/50 text-xs font-mono">
                                    {events.map((e) => {
                                        let parsed: Record<string, unknown> = {};
                                        try {
                                            parsed = JSON.parse(e.payload);
                                        } catch {
                                            parsed = {};
                                        }

                                        const props = (parsed.ingested_properties || {}) as Record<string, unknown>;
                                        const method = (props.method as string) || '-';
                                        const path = (props.path as string) || '-';
                                        const statusCode = e.statusCode ?? (props.status_code as number) ?? (props.statusCode as number);
                                        const duration = props.duration_ms ? `${props.duration_ms}ms` : '-';
                                        const env = (props.environment as string) || (props.env as string) || '-';
                                        const outcome = e.outcome ?? (props.outcome as string);

                                        // Status badge logic
                                        let statusColor = "text-muted-foreground";
                                        if ((statusCode && statusCode >= 500) || outcome === 'error') statusColor = "text-red-500";
                                        else if (statusCode && statusCode >= 400) statusColor = "text-amber-500";
                                        else if ((statusCode && statusCode >= 200) || outcome === 'success') statusColor = "text-emerald-500";

                                        const statusBg = (statusCode && statusCode >= 500) || outcome === 'error' ? "bg-red-500/10"
                                            : statusCode && statusCode >= 400 ? "bg-amber-500/10"
                                                : "bg-emerald-500/10";

                                        // Filter out the fields we promoted to columns from the preview
                                        const promotedKeys = ['method', 'path', 'status_code', 'duration_ms', 'environment', 'outcome', 'service', 'request_id', 'timestamp'];
                                        const remainingKeys = Object.keys(parsed).filter(k => !promotedKeys.includes(k));

                                        const payloadPreviewKeys = remainingKeys.slice(0, 3).join(", ");
                                        const payloadPreview = remainingKeys.length > 0
                                            ? <span className="text-muted-foreground">{`{ ${payloadPreviewKeys}${remainingKeys.length > 3 ? '...' : ''} }`}</span>
                                            : <span className="text-muted-foreground opacity-50">{"{}"}</span>;

                                        return (
                                            <div
                                                key={e.id}
                                                className={`flex px-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer group items-center ${selectedLog?.id === e.id ? 'bg-muted/50' : ''}`}
                                                onClick={() => setSelectedLog(e)}
                                            >
                                                <div className="w-[100px] shrink-0 text-muted-foreground tabular-nums select-none truncate">
                                                    {new Date(e.timestamp).toLocaleTimeString([], { hour12: false })}
                                                </div>
                                                <div className="w-[80px] shrink-0">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor} ${statusBg}`}>
                                                        {statusCode || outcome || '-'}
                                                    </span>
                                                </div>
                                                <div className="w-[80px] shrink-0 text-foreground font-semibold truncate">
                                                    {method}
                                                </div>
                                                <div className="w-[250px] shrink-0 text-muted-foreground truncate" title={path}>
                                                    {path}
                                                </div>
                                                <div className="w-[80px] shrink-0 text-right pr-4 text-muted-foreground tabular-nums truncate">
                                                    {duration}
                                                </div>
                                                <div className="w-[100px] shrink-0 text-muted-foreground truncate" title={env}>
                                                    {env}
                                                </div>
                                                <div className="truncate text-muted-foreground group-hover:text-foreground transition-colors min-w-0 flex-1">
                                                    {payloadPreview}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Sentinel for infinite scroll */}
                                    <div ref={observerTarget} className="h-4 w-full flex justify-center p-2">
                                        {eventsLoading && events.length > 0 && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {selectedLog && (
                    <LogDetailsPanel
                        log={selectedLog}
                        open={!!selectedLog}
                        onClose={() => setSelectedLog(null)}
                        onSelectRelated={(relatedEvent) => setSelectedLog(relatedEvent)}
                    />
                )}
            </div>
        </div>
    );
}
