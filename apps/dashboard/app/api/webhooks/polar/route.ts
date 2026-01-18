import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack/server";

interface PolarSubscription {
    id: string;
    customer_id: string;
    product_id: string;
    status: string;
    current_period_end: string;
    current_period_start: string;
    customer?: {
        external_id?: string;
    };
}

// Subscription tier limits
const TIER_LIMITS = {
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

const PRODUCT_ID_TO_TIER: Record<string, keyof typeof TIER_LIMITS> = {
    [process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID!]: "starter",
    [process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID!]: "pro",
};

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const event = payload.type;

        console.log("Received Polar webhook:", event);
        console.log("Payload data:", JSON.stringify(payload.data, null, 2));

        switch (event) {
            case "subscription.created":
            case "subscription.updated":
            case "subscription.active":
                await handleSubscriptionActive(payload.data);
                break;

            case "subscription.canceled":
            case "subscription.revoked":
                await handleSubscriptionCanceled(payload.data);
                break;

            default:
                console.log("Unhandled webhook event:", event);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        );
    }
}

async function handleSubscriptionActive(subscription: PolarSubscription) {
    const customerExternalId = subscription.customer?.external_id;
    if (!customerExternalId) {
        console.error("No external_id found for customer. Subscription data:", JSON.stringify(subscription, null, 2));
        // Return 200 so Polar doesn't retry - this is expected for some events
        return;
    }

    // Get the product ID from the subscription
    const productId = subscription.product_id;
    const tier = PRODUCT_ID_TO_TIER[productId] || "free";
    const limits = TIER_LIMITS[tier];

    // Update Stack Auth user metadata
    const user = await stackServerApp.getUser(customerExternalId);
    if (!user) {
        console.error("User not found:", customerExternalId);
        return;
    }

    await user.update({
        serverMetadata: {
            ...user.serverMetadata,
            polar: {
                customerId: subscription.customer_id,
                subscriptionId: subscription.id,
                tier,
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end,
                currentPeriodStart: subscription.current_period_start,
                productId,
            },
            limits,
        },
        // Also set clientReadOnlyMetadata so client can display tier
        clientReadOnlyMetadata: {
            ...user.clientReadOnlyMetadata,
            polar: { tier, status: subscription.status },
            limits,
        },
    });

    //console.log(`Updated user ${customerExternalId} to ${tier} tier`);
}

async function handleSubscriptionCanceled(subscription: PolarSubscription) {
    const customerExternalId = subscription.customer?.external_id;
    if (!customerExternalId) {
        console.error("No external_id found for customer");
        return;
    }

    // Downgrade to free tier
    const limits = TIER_LIMITS.free;

    const user = await stackServerApp.getUser(customerExternalId);
    if (!user) {
        console.error("User not found:", customerExternalId);
        return;
    }

    await user.update({
        serverMetadata: {
            ...user.serverMetadata,
            polar: {
                customerId: subscription.customer_id,
                subscriptionId: subscription.id,
                tier: "free",
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end,
                currentPeriodStart: subscription.current_period_start,
                productId: null,
            },
            limits,
        },
        clientReadOnlyMetadata: {
            ...user.clientReadOnlyMetadata,
            polar: { tier: "free", status: subscription.status },
            limits,
        },
    });

    console.log(`Downgraded user ${customerExternalId} to free tier`);
}
