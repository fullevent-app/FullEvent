"use client";

import { FulleventProvider } from "@fullevent/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <FulleventProvider config={{
                apiUrl: "http://localhost:3005",
                apiKey: "aqNmnGMUYMaPETKLcHyDdaWQxaIaCRdLLPIhsvcxdxqhhvtHoBPYpiyhIwDokOpx",
                debug: true
            }}>
                {children}
            </FulleventProvider>
        </ThemeProvider>
    );
}
