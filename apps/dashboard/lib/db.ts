import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// Default to local Docker Turso for development
const url = process.env.TURSO_DATABASE_URL || 'http://localhost:18080';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
    url,
    authToken,
});
export const db = drizzle(client);
