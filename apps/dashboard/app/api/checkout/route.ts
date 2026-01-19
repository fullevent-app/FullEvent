import { Checkout } from "@polar-sh/nextjs";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const isProd = process.env.NODE_ENV === "production";

export const GET = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    successUrl: `${appUrl}/pricing?success=true`,
    server: isProd ? "production" : "sandbox",
    theme: "dark",
});
