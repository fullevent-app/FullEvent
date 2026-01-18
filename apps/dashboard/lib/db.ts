import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
    url,
    authToken,
});
export const db = drizzle(client);
