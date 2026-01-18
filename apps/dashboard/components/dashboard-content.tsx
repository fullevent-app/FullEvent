"use client";

import { useUser } from "@stackframe/stack";
import { AppSidebar } from "@/components/app-sidebar";
import { Onboarding } from "@/components/onboarding";
import { GridLoader } from "@/components/ui/grid-loader";

export function DashboardContent({ children }: { children: React.ReactNode }) {
    const user = useUser();

    // Check onboarding status from Stack Auth metadata
    const isPending = user === undefined;
    const showOnboarding = user && !user.clientReadOnlyMetadata?.onboarded;

    // Loading state
    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <GridLoader size={64} color="#22d3ee" pattern="spiral" glow />
            </div>
        );
    }

    // Show onboarding for users who haven't completed it
    if (showOnboarding) {
        return (
            <Onboarding
                onComplete={() => {
                    window.location.reload();
                }}
            />
        );
    }

    // Regular dashboard layout
    return (
        <div className="flex min-h-screen bg-background">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
