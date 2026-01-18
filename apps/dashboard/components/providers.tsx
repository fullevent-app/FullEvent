"use client";

import { FulleventProvider } from "@fullevent/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <FulleventProvider config={{
                apiUrl: process.env.NEXT_PUBLIC_FULLEVENT_API_URL!,
                apiKey: process.env.NEXT_PUBLIC_FULLEVENT_API_KEY!,
                debug: true,
                sampling: { defaultRate: 1 }  // 100% sampling
            }}>
                {children}
                <Toaster />
            </FulleventProvider>
        </ThemeProvider>
    );
}
