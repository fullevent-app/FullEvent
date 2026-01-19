import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

let _db: LibSQLDatabase<Record<string, never>> | null = null;

function getDb() {
    if (_db) {
        return _db;
    }

    // Support both Vercel Storage Connect naming and manual env var naming
    const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL || 'file:./sqlite.db';
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_DB_AUTH_TOKEN;

    if (!url || url === 'file:./sqlite.db') {
        console.warn('Warning: TURSO_DATABASE_URL not set. Using local SQLite database. This will not work in production/serverless environments.');
    }

    console.log('DB Config (lazy init):', {
        url: url?.substring(0, 30) + '...',
        hasToken: !!authToken,
        tokenLength: authToken?.length || 0,
        timestamp: new Date().toISOString()
    });

    const client = createClient({
        url,
        authToken,
    });
    
    _db = drizzle(client);
    return _db;
}

// Export a proxy that lazily initializes the db
export const db = new Proxy({} as LibSQLDatabase<Record<string, never>>, {
    get(_, prop) {
        const dbInstance = getDb();
        return (dbInstance as any)[prop];
    }
});
