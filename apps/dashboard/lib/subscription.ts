import { stackServerApp } from "@/stack/server";

export interface SubscriptionLimits {
    eventsPerMonth: number;
    maxProjects: number;
    retentionDays: number;
}

export interface PolarMetadata {
    customerId?: string;
    subscriptionId?: string;
    tier: "free" | "starter" | "pro";
    status?: string;
    currentPeriodEnd?: string;
    currentPeriodStart?: string;
    productId?: string;
}

export const TIER_LIMITS: Record<string, SubscriptionLimits> = {
    free: {
        eventsPerMonth: 10000,
        maxProjects: 1,
        retentionDays: 7,
    },
    starter: {
        eventsPerMonth: 100000,
        maxProjects: 3,
        retentionDays: 30,
    },
    pro: {
        eventsPerMonth: 1000000,
        maxProjects: 999,
        retentionDays: 90,
    },
};

/**
 * Get subscription limits for a user
 */
export async function getUserLimits(userId: string): Promise<SubscriptionLimits> {
    const user = await stackServerApp.getUser(userId);
    if (!user) {
        return TIER_LIMITS.free;
    }

    const metadata = user.serverMetadata as { limits?: SubscriptionLimits };
    return metadata?.limits || TIER_LIMITS.free;
}

/**
 * Get subscription tier for a user
 */
export async function getUserTier(userId: string): Promise<"free" | "starter" | "pro"> {
    const user = await stackServerApp.getUser(userId);
    if (!user) {
        return "free";
    }

    const metadata = user.serverMetadata as { polar?: PolarMetadata };
    return metadata?.polar?.tier || "free";
}

/**
 * Check if user can create more projects
 */
export async function canCreateProject(userId: string, currentProjectCount: number): Promise<boolean> {
    const limits = await getUserLimits(userId);
    return currentProjectCount < limits.maxProjects;
}

/**
 * Check if user can log more events this month
 */
export async function canLogEvent(userId: string, currentMonthEvents: number): Promise<boolean> {
    const limits = await getUserLimits(userId);
    return currentMonthEvents < limits.eventsPerMonth;
}
