"use client"

import { useEffect, useState, use, useCallback, useRef } from "react";
import { getProjects, getProjectEvents, trackLogsView, getProjectSearchSuggestions, getProjectStats } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Terminal, ArrowLeft, Settings2, Plus, Trash2, Play, Radio } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import { LogDetailsPanel } from "./log-details-panel";
import { LogStats, type ProjectStats } from "@/components/log-stats";
import { LogSearchInput, ParsedQuery, SearchSuggestions } from "@/components/log-search-input";

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

interface ColumnConfig {
    id: string;
    label: string;
    path: string; // JSON path (key) to extract from payload or top-level props
    isCustom: boolean;
    visible: boolean;
    width?: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'timestamp', label: 'Timestamp', path: 'timestamp', isCustom: false, visible: true, width: '100px' },
    { id: 'status', label: 'Status', path: 'status', isCustom: false, visible: true, width: '80px' },
    { id: 'method', label: 'Method', path: 'method', isCustom: false, visible: true, width: '80px' },
    { id: 'path', label: 'Path', path: 'path', isCustom: false, visible: true, width: '250px' },
    { id: 'duration', label: 'Duration', path: 'duration_ms', isCustom: false, visible: true, width: '80px' },
    { id: 'env', label: 'Env', path: 'environment', isCustom: false, visible: true, width: '100px' },
    { id: 'payload', label: 'Payload', path: 'payload', isCustom: false, visible: true },
];

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
    const [isLive, setIsLive] = useState(false);
    const queryParamsRef = useRef<Record<string, unknown>>({});
    const eventsRef = useRef<EventLog[]>([]);
    const observerTarget = useRef(null);
    const isPollingRef = useRef(false);

    // Column state
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
    const [newColumnName, setNewColumnName] = useState("");

    const LIMIT = 100;

    // Load columns from local storage on mount
    useEffect(() => {
        const key = `fullevent_columns_${projectId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setColumns(parsed);
            } catch (e) {
                console.error("Failed to parse saved columns", e);
            }
        }
    }, [projectId]);

    const saveColumns = useCallback((newCols: ColumnConfig[]) => {
        setColumns(newCols);
        localStorage.setItem(`fullevent_columns_${projectId}`, JSON.stringify(newCols));
    }, [projectId]);

    const toggleColumn = (id: string) => {
        const newCols = columns.map(c =>
            c.id === id ? { ...c, visible: !c.visible } : c
        );
        saveColumns(newCols);
    };

    const addCustomColumn = () => {
        if (!newColumnName.trim()) return;
        const key = newColumnName.trim();
        // Prevent duplicates
        if (columns.some(c => c.path === key)) {
            toast.error("Column already exists");
            return;
        }

        const newCol: ColumnConfig = {
            id: `custom_${key}`,
            label: key, // Use key as label
            path: key,
            isCustom: true,
            visible: true,
            width: '120px'
        };
        // Insert before Payload
        const payloadIndex = columns.findIndex(c => c.id === 'payload');
        const newCols = [...columns];
        if (payloadIndex >= 0) {
            newCols.splice(payloadIndex, 0, newCol);
        } else {
            newCols.push(newCol);
        }

        saveColumns(newCols);
        setNewColumnName("");
        toast.success(`Added column: ${key}`);
    };

    const removeCustomColumn = (id: string) => {
        const newCols = columns.filter(c => c.id !== id);
        saveColumns(newCols);
    };

    const loadStats = useCallback(async (params: Record<string, unknown> = {}, isBackground = false) => {
        if (!isBackground) setStatsLoading(true);
        try {
            const statsData = await getProjectStats(projectId, params as { search?: string;[key: string]: string | number | undefined });
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load stats:", error);
        } finally {
            setStatsLoading(false);
        }
    }, [projectId]);

    const loadEvents = useCallback(async (params: Record<string, unknown> = {}, append = false, isBackground = false) => {
        if (!isBackground) setEventsLoading(true);
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
                if (entries[0].isIntersecting && hasMore && !eventsLoading && !isLive) {
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
    }, [hasMore, eventsLoading, loadEvents, isLive]);

    // Live mode polling
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;
            try {
                // In live mode, we always refresh the top of the list (append=false)
                // and do it quietly (isBackground=true)
                await Promise.all([
                    loadEvents({}, false, true),
                    loadStats({}, true)
                ]);
            } finally {
                isPollingRef.current = false;
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isLive, loadEvents, loadStats]);

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

    // Helper to extract value from event based on column path
    const getColumnValue = (e: EventLog, col: ColumnConfig, parsedPayload: Record<string, unknown>) => {
        if (col.id === 'timestamp') {
            return (
                <div className="text-muted-foreground tabular-nums select-none truncate">
                    {new Date(e.timestamp).toLocaleTimeString([], { hour12: false })}
                </div>
            );
        }

        if (col.id === 'status') {
            const props = (parsedPayload.ingested_properties || {}) as Record<string, unknown>;
            const statusCode = e.statusCode ?? (props.status_code as number) ?? (props.statusCode as number);
            const outcome = e.outcome ?? (props.outcome as string);

            let statusColor = "text-muted-foreground";
            if ((statusCode && statusCode >= 500) || outcome === 'error') statusColor = "text-red-500";
            else if (statusCode && statusCode >= 400) statusColor = "text-amber-500";
            else if ((statusCode && statusCode >= 200) || outcome === 'success') statusColor = "text-emerald-500";

            const statusBg = (statusCode && statusCode >= 500) || outcome === 'error' ? "bg-red-500/10"
                : statusCode && statusCode >= 400 ? "bg-amber-500/10"
                    : "bg-emerald-500/10";

            return (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor} ${statusBg}`}>
                    {statusCode || outcome || '-'}
                </span>
            );
        }

        if (col.id === 'payload') {
            // Logic to exclude keys that are already shown as columns
            // to avoid duplication in the preview.
            const visiblePaths = columns
                .filter(c => c.visible && c.path !== 'payload')
                .map(c => c.path);

            // Also exclude internal metadata if not explicitly requested
            const excluded = new Set([
                ...visiblePaths,
                'ingested_properties', // usually redundant wrapper
                // Keep 'event' or 'event_type' if user wants? usually redundant with context.
            ]);

            // We use the top-level keys of parsedPayload (which is the "wide event")
            const remainingKeys = Object.keys(parsedPayload).filter(k =>
                !k.startsWith('fullevent') && !excluded.has(k) && typeof parsedPayload[k] !== 'object'
            );

            const payloadPreview = remainingKeys.slice(0, 3).join(", ");
            return (
                <div className="truncate text-muted-foreground group-hover:text-foreground transition-colors min-w-0 flex-1">
                    {remainingKeys.length > 0
                        ? <span className="text-muted-foreground">{`{ ${payloadPreview}${remainingKeys.length > 3 ? '...' : ''} }`}</span>
                        : <span className="text-muted-foreground opacity-50">{"{}"}</span>}
                </div>
            );
        }

        // Generic extraction for standard fields or custom fields
        // 1. Try simple property access
        let value = parsedPayload[col.path];

        // 2. If undefined, try looking in ingested_properties (legacy/nested support)
        if (value === undefined && parsedPayload.ingested_properties) {
            value = (parsedPayload.ingested_properties as Record<string, unknown>)[col.path];
        }

        // Special formatting
        if (col.path === 'duration_ms' && value) return <div className="text-right pr-4 text-muted-foreground tabular-nums truncate">{value}ms</div>;

        return <div className="text-muted-foreground truncate" title={String(value)}>{String(value ?? '-')}</div>;
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
                    <div className="flex gap-2">
                        <Button
                            variant={isLive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsLive(!isLive)}
                            className={isLive ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 animate-pulse-slow transition-all duration-300" : "text-muted-foreground"}
                        >
                            {isLive ? <Radio className="mr-2 h-4 w-4 animate-pulse" /> : <Play className="mr-2 h-4 w-4" />}
                            {isLive ? "Live" : "Go Live"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={eventsLoading}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                <LogStats stats={stats} loading={statsLoading && !stats} />

                <div className="mt-2 flex gap-2">
                    <div className="flex-1">
                        <LogSearchInput onSearch={handleSearch} isLoading={eventsLoading} dynamicSuggestions={searchSuggestions} />
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="h-10">
                                <Settings2 className="mr-2 h-4 w-4" />
                                Columns
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader className="p-6">
                                <SheetTitle>Customize Columns</SheetTitle>
                                <SheetDescription>
                                    Select which fields to display in the table. You can add custom fields from your JSON payload.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="px-6 pb-6 space-y-6">
                                {/* Standard Columns */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium leading-none">Standard Columns</h4>
                                    <div className="grid gap-4">
                                        {columns.filter(c => !c.isCustom).map(column => (
                                            <div key={column.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={column.id}
                                                    checked={column.visible}
                                                    onCheckedChange={() => toggleColumn(column.id)}
                                                />
                                                <Label
                                                    htmlFor={column.id}
                                                    className="leading-none cursor-pointer"
                                                >
                                                    {column.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Columns */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium leading-none">Custom Columns</h4>
                                    </div>

                                    {columns.filter(c => c.isCustom).length === 0 && (
                                        <div className="text-xs text-muted-foreground italic">
                                            No custom columns added. Add a JSON key below.
                                        </div>
                                    )}

                                    <div className="grid gap-4">
                                        {columns.filter(c => c.isCustom).map(column => (
                                            <div key={column.id} className="flex items-center justify-between group">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={column.id}
                                                        checked={column.visible}
                                                        onCheckedChange={() => toggleColumn(column.id)}
                                                    />
                                                    <Label
                                                        htmlFor={column.id}
                                                        className="leading-none cursor-pointer font-mono text-xs"
                                                    >
                                                        {column.label}
                                                    </Label>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-50 group-hover:opacity-100"
                                                    onClick={() => removeCustomColumn(column.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 flex gap-2">
                                        <Input
                                            placeholder="e.g. user.email"
                                            value={newColumnName}
                                            onChange={(e) => setNewColumnName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCustomColumn()}
                                            className="h-8 text-xs"
                                        />
                                        <Button size="sm" className="h-8" onClick={addCustomColumn}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
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
                            // ... no events ...
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 p-8">
                                <Terminal className="h-12 w-12 mx-auto opacity-20" />
                                <p>No events found matching your criteria.</p>
                            </div>
                        ) : (
                            <div className="min-w-full inline-block align-middle">
                                <div className="sticky top-0 z-10 flex bg-muted/40 backdrop-blur-sm border-b border-border px-4 py-2 text-muted-foreground font-medium select-none text-xs">
                                    {columns.map(col => col.visible && (
                                        <div key={col.id} className="shrink-0 px-1" style={{ width: col.id === 'payload' ? 'auto' : col.width, flex: col.id === 'payload' ? '1' : 'none' }}>
                                            {col.label}
                                        </div>
                                    ))}
                                </div>
                                <div className="divide-y divide-border/50 text-xs font-mono">
                                    {events.map((e) => {
                                        let parsed: Record<string, unknown> = {};
                                        try {
                                            parsed = JSON.parse(e.payload);
                                        } catch {
                                            parsed = {};
                                        }

                                        return (
                                            <div
                                                key={e.id}
                                                className={`flex px-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer group items-center ${selectedLog?.id === e.id ? 'bg-muted/50' : ''}`}
                                                onClick={() => setSelectedLog(e)}
                                            >
                                                {columns.map(col => col.visible && (
                                                    <div key={col.id} className="shrink-0 overflow-hidden px-1" style={{ width: col.id === 'payload' ? 'auto' : col.width, flex: col.id === 'payload' ? '1' : 'none' }}>
                                                        {getColumnValue(e, col, parsed)}
                                                    </div>
                                                ))}
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
        </div >
    );
}
