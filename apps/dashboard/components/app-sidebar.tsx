"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Book, PanelLeftClose, PanelLeftOpen, Sparkles, Crown, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { UserButton } from "./user-button";
import { LogLineLogo } from "@/components/ui/logo";
import { useUser } from "@stackframe/stack";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function AppSidebar({ className, ...props }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [triggerPulse, setTriggerPulse] = useState(false);
    const user = useUser();

    // Get subscription tier from user metadata
    const tier = (user?.clientReadOnlyMetadata as { polar?: { tier?: string } })?.polar?.tier || "free";
    const isPaid = tier !== "free";

    const handleToggle = () => {
        if (collapsed) {
            // Opening the sidebar - trigger pulse animation
            setTriggerPulse(true);
            setTimeout(() => setTriggerPulse(false), 700);
        }
        setCollapsed(!collapsed);
    };

    // Tier display config
    const tierConfig: Record<string, { label: string; icon: typeof Sparkles | null; className: string }> = {
        free: {
            label: "Free",
            icon: null,
            className: "text-muted-foreground",
        },
        starter: {
            label: "Starter",
            icon: Sparkles,
            className: "text-blue-400",
        },
        pro: {
            label: "Pro",
            icon: Crown,
            className: "text-amber-400",
        },
    };

    const currentTier = tierConfig[tier] || tierConfig.free;
    const TierIcon = currentTier.icon;

    const items = [
        {
            title: "Projects",
            icon: LayoutDashboard,
            href: "/",
            active: pathname === "/" || pathname.startsWith("/logs"),
        },
        {
            title: isPaid ? "Manage Subscription" : "Upgrade",
            icon: isPaid ? Crown : ArrowUpRight,
            href: isPaid ? "/api/portal" : "/pricing",
            active: pathname === "/pricing",
            highlight: !isPaid, // Highlight upgrade button for free users
            isApiRoute: isPaid, // API routes need regular anchor tags
        },
        {
            title: "Documentation",
            icon: Book,
            href: "https://docs.fullevent.app",
            external: true,
        },
    ];

    return (
        <div
            className={cn(
                "relative flex flex-col border-r min-h-screen bg-background transition-[width] duration-200 ease-out",
                collapsed ? "w-16" : "w-64",
                className
            )}
            {...props}
        >
            <div className="flex-1 flex flex-col pt-6 pb-4 overflow-hidden">
                {/* Header - fixed height, icon always left-aligned at same position */}
                <div className="h-8 mb-8 px-[18px] flex items-center">
                    <div className="relative h-6 w-6 flex-shrink-0">
                        <LogLineLogo size={24} animated={true} variant="stream" triggerPulse={triggerPulse} />
                    </div>
                    <div className={cn(
                        "ml-2 overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
                        collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                    )}>
                        <span className="text-lg font-semibold whitespace-nowrap">FullEvent</span>
                    </div>
                </div>

                {/* Navigation items - icon position never changes */}
                <nav className="space-y-1 px-3">
                    {items.map((item) => {
                        const linkClasses = cn(
                            "flex items-center h-10 px-[6px] text-sm font-medium transition-colors",
                            item.active
                                ? "bg-accent text-accent-foreground"
                                : item.highlight
                                    ? "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        );

                        const content = (
                            <>
                                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <span className={cn(
                                    "ml-2 overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-out",
                                    collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                                )}>
                                    {item.title}
                                </span>
                            </>
                        );

                        // Use regular anchor for API routes (they return redirects)
                        if (item.isApiRoute) {
                            return (
                                <a
                                    key={item.title}
                                    href={item.href}
                                    className={linkClasses}
                                    title={collapsed ? item.title : undefined}
                                >
                                    {content}
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                target={item.external ? "_blank" : undefined}
                                className={linkClasses}
                                title={collapsed ? item.title : undefined}
                            >
                                {content}
                            </Link>
                        );
                    })}
                </nav>

                {/* Subscription Status - shown above footer */}
                <div className="mt-auto px-3 pt-4">
                    <div className={cn(
                        "flex items-center h-10 px-[6px] text-sm",
                        currentTier.className
                    )} title={collapsed ? `${currentTier.label} Plan` : undefined}>
                        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                            {TierIcon ? (
                                <TierIcon className="h-5 w-5" />
                            ) : (
                                <div className="h-5 w-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center">
                                    <span className="text-[8px] font-bold">F</span>
                                </div>
                            )}
                        </div>
                        <span className={cn(
                            "ml-2 overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-out font-medium",
                            collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                        )}>
                            {currentTier.label} Plan
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Area */}
            <div className="p-3 border-t overflow-hidden">
                <div className="flex items-center h-9">
                    {/* User button - fades out */}
                    <div className={cn(
                        "overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
                        collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                    )}>
                        <UserButton />
                    </div>

                    {/* Spacer that shrinks */}
                    <div className={cn(
                        "transition-[flex] duration-200 ease-out",
                        collapsed ? "flex-none" : "flex-1"
                    )} />

                    {/* Theme toggle - fades out */}
                    <div className={cn(
                        "overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
                        collapsed ? "max-w-0 opacity-0" : "max-w-[40px] opacity-100 mr-1"
                    )}>
                        <ThemeToggle />
                    </div>

                    {/* Toggle button - always visible, centered when collapsed */}
                    <div className={cn(
                        "flex-shrink-0 transition-[margin] duration-200 ease-out",
                        collapsed ? "mx-auto" : ""
                    )}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggle}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-4 w-4" />
                            ) : (
                                <PanelLeftClose className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
