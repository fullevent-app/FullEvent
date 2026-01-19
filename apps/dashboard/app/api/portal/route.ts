import { CustomerPortal } from "@polar-sh/nextjs";
import { NextRequest } from "next/server";
import { stackServerApp } from "@/stack/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const isProd = process.env.NODE_ENV === "production";

export const GET = CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    getCustomerId: async (_req: NextRequest) => {
        // Get the authenticated user from Stack Auth
        const user = await stackServerApp.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Get the Polar customer ID from user metadata
        const polarMetadata = user.serverMetadata as { polar?: { customerId?: string } };
        const customerId = polarMetadata?.polar?.customerId;

        if (!customerId) {
            throw new Error("No Polar customer ID found for user");
        }

        return customerId;
    },
    returnUrl: appUrl,
    server: isProd ? "production" : "sandbox",
});
