/**
 * Stack Auth REST API client for standalone Node.js servers
 * Uses the REST API instead of the Next.js-specific StackServerApp
 */

const STACK_API_URL = 'https://api.stack-auth.com/api/v1';
const STACK_PROJECT_ID = process.env.STACK_PROJECT_ID;
const STACK_SECRET_KEY = process.env.STACK_SECRET_KEY;

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

export const stackAuth = {
    async getUser(userId: string): Promise<StackUser | null> {
        if (!STACK_PROJECT_ID || !STACK_SECRET_KEY) {
            return null;
        }

        try {
            const response = await fetch(`${STACK_API_URL}/projects/${STACK_PROJECT_ID}/users/${userId}`, {
                headers: {
                    'x-stack-secret-server-key': STACK_SECRET_KEY,
                    'x-stack-project-id': STACK_PROJECT_ID,
                },
            });

            if (!response.ok) {
                console.error(`Stack Auth API error: ${response.status} ${response.statusText}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch user from Stack Auth:', error);
            return null;
        }
    },
};
