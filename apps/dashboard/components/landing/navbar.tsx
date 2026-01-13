"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { ChevronDown, ArrowLeft, LayoutDashboard, FileText, Sparkles, Activity, Github, ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FullEventLogo } from "./logo";

// Default menu sections
export const defaultMenuSections: NavbarMenuSection[] = [
    {
        id: "product",
        links: [
            {
                label: "Dashboard",
                href: "/dashboard",
                description: "Your mission control for data exploration",
                icon: <LayoutDashboard className="w-5 h-5" />,
            },
            {
                label: "Live Events",
                href: "/live-logs",
                description: "Watch events flow in real-time",
                icon: <Activity className="w-5 h-5" />,
            },
        ],
    },
    {
        id: "resources",
        links: [
            {
                label: "Documentation",
                href: "/docs",
                description: "Guides, API references, and tutorials",
                icon: <FileText className="w-5 h-5" />,
            },
            {
                label: "Changelog",
                href: "/changelog",
                description: "Latest updates and releases",
                icon: <Sparkles className="w-5 h-5" />,
            },
        ],
    },
];

export interface NavbarMenuLink {
    label: string;
    href: string;
    icon?: React.ReactNode;
    external?: boolean;
    description?: string;
}

export interface NavbarMenuSection {
    id: string;
    links: NavbarMenuLink[];
}

export interface NavbarMenuProps {
    activeMenu: string;
    sections: NavbarMenuSection[];
}

export interface NavbarWithMenuProps {
    sections?: NavbarMenuSection[];
    navItems?: Array<
        | { type: "link"; label: string; href: string }
        | { type: "dropdown"; label: string; menu: string }
    >;
    logo?: React.ReactNode;
    cta?: React.ReactNode;
    showBackButton?: boolean;
}

export function NavbarMenu({ activeMenu, sections }: NavbarMenuProps) {
    const activeSection = sections.find((section) => section.id === activeMenu);
    if (!activeSection) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 z-[60] w-full bg-[#050507] border-b border-white/[0.05]"
        >
            <div className="container mx-auto px-6 py-6 max-w-5xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeSection.links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-300"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-all duration-300">
                                {link.icon}
                            </span>
                            <div>
                                <span className="block text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                                    {link.label}
                                </span>
                                {link.description && (
                                    <span className="mt-0.5 block text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                        {link.description}
                                    </span>
                                )}
                            </div>
                            {link.external && (
                                <ExternalLink className="ml-auto h-4 w-4 text-zinc-600" />
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export function NavbarWithMenu({
    sections = defaultMenuSections,
    navItems = [],
    logo,
    cta,
    showBackButton,
}: NavbarWithMenuProps) {
    const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
    const pathname = usePathname();
    const shouldShowBack = showBackButton ?? pathname !== "/";

    const defaultNavItems = [
        { type: "dropdown", label: "Product", menu: "product" },
        { type: "dropdown", label: "Resources", menu: "resources" },
        { type: "link", label: "Pricing", href: "/pricing" },
    ] as const;

    const items = navItems.length > 0 ? navItems : defaultNavItems;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 font-sans">
            {/* Background - only visible when dropdown is open */}
            <div 
                className={cn(
                    "absolute inset-0 transition-all duration-200",
                    activeDropdown 
                        ? "bg-[#050507]" 
                        : "bg-transparent"
                )} 
            />

            <div
                className="relative mx-auto w-full"
                onMouseLeave={() => setActiveDropdown(null)}
            >
                <div className="flex h-16 w-full items-center justify-between px-6 max-w-[1400px] mx-auto">
                    <div className="flex items-center gap-6">
                        {/* Back button */}
                        {shouldShowBack && (
                            <Link
                                href="/"
                                className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs uppercase tracking-widest font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Back</span>
                            </Link>
                        )}

                        {/* Logo */}
                        <div className="flex items-center gap-2">{logo}</div>

                        <div className="h-5 w-px bg-white/10 hidden md:block" />

                        {/* Nav items */}
                        <div className="hidden md:flex items-center gap-1">
                            {items.map((item) =>
                                item.type === "link" ? (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="relative flex h-9 items-center px-4 text-sm text-zinc-400 hover:text-white transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        key={item.menu}
                                        className={cn(
                                            "relative flex h-9 items-center gap-1 px-4 text-sm transition-colors",
                                            activeDropdown === item.menu
                                                ? "text-white"
                                                : "text-zinc-400 hover:text-white"
                                        )}
                                        onMouseEnter={() => setActiveDropdown(item.menu)}
                                    >
                                        {item.label}
                                        <ChevronDown
                                            size={14}
                                            className={cn(
                                                "transition duration-200",
                                                activeDropdown === item.menu && "rotate-180"
                                            )}
                                        />
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">{cta}</div>
                </div>

                <AnimatePresence>
                    {activeDropdown && (
                        <NavbarMenu activeMenu={activeDropdown} sections={sections} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export function Navbar() {
    return (
        <NavbarWithMenu
            logo={<FullEventLogo />}
            cta={
                <div className="flex items-center gap-3">
                    <Link
                        href="https://github.com/fullevent/fullevent"
                        target="_blank"
                        className="text-zinc-500 hover:text-white transition-colors p-2"
                    >
                        <Github className="h-5 w-5" />
                    </Link>
                    <Link href="/login">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-white/5 hidden sm:inline-flex"
                        >
                            Sign In
                        </Button>
                    </Link>
                    <Link href="/register">
                        <Button
                            size="sm"
                            className="bg-white text-black hover:bg-zinc-900 font-medium"
                        >
                            Get Started
                        </Button>
                    </Link>
                </div>
            }
        />
    );
}
