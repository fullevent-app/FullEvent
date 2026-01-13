import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { apiKey } from "better-auth/plugins";

import * as schema from "./auth-schema";

import { fullEvent } from "./fullevent";

export const auth = betterAuth({
    // Obscure auth provider by using generic route path and cookie prefix
    basePath: "/api/v1/identity",
    advanced: {
        cookiePrefix: "fe", // Short for "fullevent" - avoids "better-auth" prefix
    },
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
            ...schema
        }
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            onboardingCompleted: {
                type: "boolean",
                defaultValue: false,
            }
        }
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await fullEvent.ingest("user_signup", {
                        userId: user.id,
                        email: user.email,
                    });
                }
            }
        },
        session: {
            create: {
                after: async (session) => {
                    await fullEvent.ingest("user_signin", {
                        userId: session.userId,
                        sessionId: session.id,
                    });
                }
            }
        }
    },
    onAPIError: {
        onError: async (error, ctx) => {
            const err = error as { status?: number; code?: string };
            const context = ctx as { path?: string; method?: string };
            if (err?.status === 401 || err?.status === 403) {
                await fullEvent.ingest("user_auth_failed", {
                    status: err.status,
                    code: err.code,
                    path: context?.path,
                    method: context?.method,
                });
            }
        }
    },
    plugins: [
        apiKey({
            enableMetadata: true
        })
    ],
});
