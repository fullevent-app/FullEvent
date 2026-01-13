"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings, Book } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function AppSidebar({ className, ...props }: SidebarProps) {
    const pathname = usePathname();

    const items = [
        {
            title: "Projects",
            icon: LayoutDashboard,
            href: "/dashboard",
            active: pathname === "/dashboard" || pathname.startsWith("/dashboard/logs"),
        },
        {
            title: "Settings",
            icon: Settings,
            href: "/dashboard/settings",
            active: pathname === "/dashboard/settings",
        },
        {
            title: "Documentation",
            icon: Book,
            href: "http://localhost:3000/docs", // Pointing to the docs app
            external: true,
        },
    ];

    return (
        <div className={cn("pb-12 w-64 border-r min-h-screen bg-background", className)} {...props}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        FullEvent
                    </h2>
                    <div className="space-y-1">
                        {items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                target={item.external ? "_blank" : undefined}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transparent transition-colors",
                                    item.active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Area */}
            <div className="absolute bottom-4 left-0 w-full px-4">
                <div className="flex items-center justify-between">
                    <ThemeToggle />
                    {/* Add Logout here later */}
                </div>
            </div>
        </div>
    );
}
