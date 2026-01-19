import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:./sqlite.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!process.env.TURSO_DATABASE_URL) {
    console.warn('Warning: TURSO_DATABASE_URL not set. Using local SQLite database. This will not work in production/serverless environments.');
}

const client = createClient({
    url,
    authToken,
});
export const db = drizzle(client);
