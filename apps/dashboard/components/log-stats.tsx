"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertOctagon, Layers } from "lucide-react";

export interface ProjectStats {
    total: number;
    errors: number;
    errorRate: number;
    successRate: number;
    uniqueEventTypes?: number;
}

interface LogStatsProps {
    stats?: ProjectStats;
    loading?: boolean;
}

export function LogStats({ stats, loading }: LogStatsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 grid-cols-3 mb-6">
                <div className="h-24 bg-muted/20 animate-pulse rounded-lg" />
                <div className="h-24 bg-muted/20 animate-pulse rounded-lg" />
                <div className="h-24 bg-muted/20 animate-pulse rounded-lg" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="grid gap-4 grid-cols-3 mb-6">
                <Card className="bg-zinc-950/50 border-zinc-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sampled Events</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/50 border-zinc-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Errors Captured</CardTitle>
                        <AlertOctagon className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/50 border-zinc-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Event Types</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-4 grid-cols-3 mb-6">
            <Card className="bg-zinc-950/50 border-zinc-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sampled Events</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Events stored (sampling applied)</p>
                </CardContent>
            </Card>
            <Card className="bg-zinc-950/50 border-zinc-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Errors Captured</CardTitle>
                    <AlertOctagon className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">{stats.errors.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All errors are captured</p>
                </CardContent>
            </Card>
            <Card className="bg-zinc-950/50 border-zinc-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Event Types</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueEventTypes?.toLocaleString() || '-'}</div>
                    <p className="text-xs text-muted-foreground">Unique event types</p>
                </CardContent>
            </Card>
        </div>
    );
}
