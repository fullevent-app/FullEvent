/**
 * Stack Auth REST API client for standalone Node.js servers
 * Uses the REST API instead of the Next.js-specific StackServerApp
 * 
 * PURPOSE: Enforces subscription-based event limits
 * 
 * Flow:
 * 1. User subscribes to a plan (Starter, Pro, etc.) via Polar
 * 2. Polar webhook updates user's server_metadata.limits.eventsPerMonth in Stack Auth
 * 3. When events are ingested, the API:
 *    - Fetches the user's limit from Stack Auth (cached for 5 min)
 *    - Counts their current monthly usage from ClickHouse
 *    - Blocks ingestion if they've exceeded their limit
 * 
 * Includes in-memory caching to prevent rate limiting during high-traffic ingestion
 */

const STACK_API_URL = 'https://api.stack-auth.com/api/v1';
const STACK_PROJECT_ID = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const STACK_SECRET_KEY = process.env.STACK_SECRET_SERVER_KEY;

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

if (!STACK_PROJECT_ID || !STACK_SECRET_KEY) {
    console.warn('Warning: STACK_PROJECT_ID or STACK_SECRET_KEY not set. User limit checks will fail.');
}

interface StackUser {
    id: string;
    server_metadata?: {
        limits?: {
            eventsPerMonth?: number;
        };
    };
}

interface CacheEntry {
    user: StackUser | null;
    timestamp: number;
    pending?: Promise<StackUser | null>;
}

// In-memory cache for user data
const userCache = new Map<string, CacheEntry>();

// Cleanup stale cache entries periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of userCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS * 2) {
            userCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

export const stackAuth = {
    async getUser(userId: string): Promise<StackUser | null> {
        if (!STACK_PROJECT_ID || !STACK_SECRET_KEY) {
            return null;
        }

        const now = Date.now();
        const cached = userCache.get(userId);

        // Return cached value if still valid
        if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
            // If there's a pending request, wait for it (deduplication)
            if (cached.pending) {
                return cached.pending;
            }
            return cached.user;
        }

        // Create a promise for this request (deduplication for concurrent requests)
        const fetchPromise = this._fetchUser(userId);

        // Store pending promise immediately to deduplicate concurrent requests
        userCache.set(userId, {
            user: cached?.user ?? null,
            timestamp: cached?.timestamp ?? now,
            pending: fetchPromise,
        });

        try {
            const user = await fetchPromise;
            // Update cache with result
            userCache.set(userId, {
                user,
                timestamp: now,
            });
            return user;
        } catch (error) {
            // On error, keep stale cache if available, otherwise null
            userCache.set(userId, {
                user: cached?.user ?? null,
                timestamp: now,
            });
            return cached?.user ?? null;
        }
    },

    async _fetchUser(userId: string): Promise<StackUser | null> {
        try {
            const response = await fetch(`${STACK_API_URL}/users/${userId}`, {
                headers: {
                    'x-stack-access-type': 'server',
                    'x-stack-secret-server-key': STACK_SECRET_KEY!,
                    'x-stack-project-id': STACK_PROJECT_ID!,
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Stack Auth API error: ${response.status} ${response.statusText}`, {
                    url: `${STACK_API_URL}/users/${userId}`,
                    projectId: STACK_PROJECT_ID,
                    userId,
                    errorBody,
                });
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch user from Stack Auth:', error);
            return null;
        }
    },
};
