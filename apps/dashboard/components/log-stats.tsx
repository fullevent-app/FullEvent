"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertOctagon, CheckCircle } from "lucide-react";

export interface ProjectStats {
    total: number;
    errors: number;
    errorRate: number;
    successRate: number;
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
                        <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/50 border-zinc-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Errors</CardTitle>
                        <AlertOctagon className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/50 border-zinc-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
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
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All logged events</p>
                </CardContent>
            </Card>
            <Card className="bg-zinc-950/50 border-zinc-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Errors</CardTitle>
                    <AlertOctagon className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">{stats.errors.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{stats.errorRate}% error rate</p>
                </CardContent>
            </Card>
            <Card className="bg-zinc-950/50 border-zinc-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-500">{stats.successRate}%</div>
                    <p className="text-xs text-muted-foreground">{(stats.total - stats.errors).toLocaleString()} successful</p>
                </CardContent>
            </Card>
        </div>
    );
}
