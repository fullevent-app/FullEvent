import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:/Users/madison/source/fullevent/apps/dashboard/sqlite.db' });
export const db = drizzle(client);
