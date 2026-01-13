import { FullEvent } from "@fullevent/node-sdk";

export const fullEvent = new FullEvent({
    apiKey: process.env.FULLEVENT_API_KEY || "ufgbTzJJyqXBaFINkARDnHfuTDpahFwqFsIqzmKSNsaNItjNYAFZUgTxvwLlISLP",
    baseUrl: process.env.NODE_ENV === "production"
        ? "https://api.fullevent.co" // Placeholder for production
        : "http://localhost:3005"
});
