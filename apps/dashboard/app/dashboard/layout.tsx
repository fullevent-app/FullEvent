"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Onboarding } from "@/components/onboarding";
import { authClient } from "@/lib/auth-client";
import { GridLoader } from "@/components/ui/grid-loader";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    const showOnboarding = useMemo(() => {
        if (isPending || !session?.user) return null;
        const user = session.user as { onboardingCompleted?: boolean };
        return user.onboardingCompleted !== true;
    }, [session, isPending]);

    // Loading state
    if (isPending || showOnboarding === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <GridLoader size={64} color="#22d3ee" pattern="spiral" glow />
            </div>
        );
    }

    // Show onboarding for new users
    if (showOnboarding) {
        return (
            <Onboarding
                onComplete={() => {
                    router.refresh();
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
