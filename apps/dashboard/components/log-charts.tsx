"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, XAxis } from "recharts";
import { getProjectHistogram } from "@/app/actions/projects";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

interface HistogramDataPoint {
    bucket: string;
    value: number;
    label?: string;
}

interface HistogramData {
    volume: HistogramDataPoint[];
    errors: HistogramDataPoint[];
    latency: Array<{
        bucket: string;
        p50: number;
        p95: number;
        p99: number;
        label?: string;
    }>;
}

interface LogChartsProps {
    projectId: string;
    searchParams?: Record<string, unknown>;
    className?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: '1h', label: 'Last hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
];

const volumeConfig = {
    value: { label: "Events", color: "var(--chart-1)" },
} satisfies ChartConfig;

const errorsConfig = {
    value: { label: "Errors", color: "hsl(0 84% 60%)" },
} satisfies ChartConfig;

const latencyConfig = {
    p50: { label: "p50", color: "var(--chart-1)" },
    p95: { label: "p95", color: "var(--chart-2)" },
    p99: { label: "p99", color: "var(--chart-3)" },
} satisfies ChartConfig;

const dotBgStyle: React.CSSProperties = {
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
    backgroundSize: '10px 10px',
};

export function LogCharts({ projectId, searchParams, className }: LogChartsProps) {
    const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');

    const loadHistogram = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getProjectHistogram(projectId, {
                timeRange,
                search: searchParams?.search as string | undefined,
            });
            setHistogramData(data);
        } catch (error) {
            console.error("Failed to load histogram data:", error);
        } finally {
            setLoading(false);
        }
    }, [projectId, timeRange, searchParams]);

    useEffect(() => {
        loadHistogram();
    }, [loadHistogram]);

    const totalVolume = histogramData?.volume.reduce((sum, d) => sum + d.value, 0) || 0;
    const totalErrors = histogramData?.errors.reduce((sum, d) => sum + d.value, 0) || 0;
    const errorRate = totalVolume > 0 ? ((totalErrors / totalVolume) * 100).toFixed(2) : '0';
    const avgLatency = histogramData?.latency.length
        ? Math.round(histogramData.latency.reduce((sum, d) => sum + d.p50, 0) / histogramData.latency.length)
        : 0;

    return (
        <div className={className}>
            {/* Time range selector */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Events:</span>
                        <span className="font-semibold text-foreground">{totalVolume.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Errors:</span>
                        <span className="font-semibold text-red-500">{totalErrors.toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs">({errorRate}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Avg Latency:</span>
                        <span className="font-semibold text-foreground">{avgLatency}ms</span>
                    </div>
                </div>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TIME_RANGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Event Volume */}
                <Card style={dotBgStyle}>
                    <CardHeader>
                        <CardTitle>Event Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="aspect-video bg-muted/10 animate-pulse rounded" />
                        ) : (
                            <ChartContainer config={volumeConfig} className="aspect-[4/1]">
                                <BarChart accessibilityLayer data={histogramData?.volume || []}>
                                    <XAxis
                                        dataKey="bucket"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Errors */}
                <Card style={dotBgStyle}>
                    <CardHeader>
                        <CardTitle>Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="aspect-video bg-muted/10 animate-pulse rounded" />
                        ) : (
                            <ChartContainer config={errorsConfig} className="aspect-[4/1]">
                                <BarChart accessibilityLayer data={histogramData?.errors || []}>
                                    <XAxis
                                        dataKey="bucket"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Latency */}
                <Card style={dotBgStyle}>
                    <CardHeader>
                        <CardTitle>
                            Latency
                            <div className="flex gap-2 text-[10px] text-muted-foreground ml-auto">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-[var(--chart-1)]" />
                                    p50
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-[var(--chart-2)]" />
                                    p95
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-[var(--chart-3)]" />
                                    p99
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="aspect-video bg-muted/10 animate-pulse rounded" />
                        ) : (
                            <ChartContainer config={latencyConfig} className="aspect-[4/1]">
                                <BarChart accessibilityLayer data={histogramData?.latency || []}>
                                    <XAxis
                                        dataKey="bucket"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent />}
                                    />
                                    <Bar dataKey="p50" stackId="a" fill="var(--color-p50)" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="p95" stackId="a" fill="var(--color-p95)" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="p99" stackId="a" fill="var(--color-p99)" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card style={dotBgStyle}>
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Events</span>
                                <span className="font-mono font-medium">{totalVolume.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Error Rate</span>
                                <span className="font-mono font-medium text-red-500">{errorRate}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">p50 Latency</span>
                                <span className="font-mono font-medium">{avgLatency}ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">p99 Latency</span>
                                <span className="font-mono font-medium">
                                    {histogramData?.latency.length
                                        ? Math.round(histogramData.latency.reduce((sum, d) => sum + d.p99, 0) / histogramData.latency.length)
                                        : 0}ms
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
