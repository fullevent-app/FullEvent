import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// Support both Vercel Storage Connect naming and manual env var naming
const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL || 'file:./sqlite.db';
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_DB_AUTH_TOKEN;

if (!url || url === 'file:./sqlite.db') {
    console.warn('Warning: TURSO_DATABASE_URL not set. Using local SQLite database. This will not work in production/serverless environments.');
}

console.log('DB Config:', {
    url: url.substring(0, 30) + '...',
    hasToken: !!authToken,
    tokenLength: authToken?.length || 0
});

const client = createClient({
    url,
    authToken,
});
export const db = drizzle(client);
