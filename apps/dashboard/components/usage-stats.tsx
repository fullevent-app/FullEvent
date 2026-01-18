"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSubscriptionDetails } from "@/app/actions/projects";
import { Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface SubscriptionDetails {
    tier: "free" | "starter" | "pro";
    limits: {
        eventsPerMonth: number;
        maxProjects: number;
        retentionDays: number;
    };
    eventCount: number;
    projectCount: number;
}

export function UsageStats() {
    const [details, setDetails] = useState<SubscriptionDetails | null>(null);

    useEffect(() => {
        getSubscriptionDetails().then(setDetails).catch(console.error);
    }, []);

    if (!details) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Subscription Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-2 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-2 bg-muted rounded animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { tier, limits, eventCount } = details;

    // Calculate percentages
    const eventUsagePercent = Math.min((eventCount / limits.eventsPerMonth) * 100, 100);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Subscription Usage
                </CardTitle>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">
                        {tier} Plan
                    </span>
                    {tier === 'free' && (
                        <Button variant="outline" size="sm" asChild className="h-6 text-xs">
                            <Link href="/pricing">Upgrade</Link>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-muted-foreground" />
                            <span>Monthly Events</span>
                        </div>
                        <span className={eventCount >= limits.eventsPerMonth ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {eventCount.toLocaleString()} / {limits.eventsPerMonth.toLocaleString()}
                        </span>
                    </div>
                    <Progress value={eventUsagePercent} className={eventCount >= limits.eventsPerMonth ? "bg-destructive/20 [&>div]:bg-destructive" : "h-2"} />
                    {eventCount >= limits.eventsPerMonth && (
                        <p className="text-xs text-destructive">Monthly event limit reached.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
