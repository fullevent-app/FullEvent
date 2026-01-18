"use client";

import { useUser } from "@stackframe/stack";
import { Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
    collapsed?: boolean;
}

export function SubscriptionBadge({ collapsed }: SubscriptionBadgeProps) {
    const user = useUser();

    // Server metadata isn't directly accessible from client, 
    // so we'll use a simple approach with clientReadOnlyMetadata
    const tier = (user?.clientReadOnlyMetadata as { polar?: { tier?: string } })?.polar?.tier || "free";

    const tierConfig = {
        free: {
            label: "Free",
            icon: null,
            className: "text-muted-foreground",
        },
        starter: {
            label: "Starter",
            icon: Sparkles,
            className: "text-blue-500",
        },
        pro: {
            label: "Pro",
            icon: Crown,
            className: "text-amber-500",
        },
    };

    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.free;
    const Icon = config.icon;

    if (collapsed) {
        return (
            <Link
                href="/pricing"
                className={cn("flex items-center justify-center", config.className)}
                title={`${config.label} Plan`}
            >
                {Icon ? <Icon className="h-4 w-4" /> : (
                    <div className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <span className="text-[10px] font-medium text-white">
                            {config.label.slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                )}
            </Link>
        );
    }

    return (
        <div className="space-y-1 px-1">
            <p className="text-xs font-medium text-muted-foreground ml-1">Plan</p>
            <Link
                href="/pricing"
                className={cn(
                    "flex items-center gap-2 text-sm hover:opacity-80 transition-opacity",
                    config.className
                )}
            >
                {Icon ? <Icon className="h-4 w-4" /> : (
                    <div className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <span className="text-[10px] font-medium text-white">
                            {config.label}
                        </span>
                    </div>
                )}
            </Link>
        </div>
    );
}
