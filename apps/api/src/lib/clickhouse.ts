import 'dotenv/config'
import { createClient } from '@clickhouse/client'

console.log('ClickHouse Config:', {
    url: process.env.CLICKHOUSE_HOST,
    user: process.env.CLICKHOUSE_USER,
    hasPassword: !!process.env.CLICKHOUSE_PASSWORD,
    passwordLength: process.env.CLICKHOUSE_PASSWORD?.length,
    db: process.env.CLICKHOUSE_DB
})

export const clickhouse = createClient({
    url: process.env.CLICKHOUSE_HOST || 'default',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DB || 'default',
    request_timeout: 30_000,
})

export async function ensureTableExists() {
    await clickhouse.command({
        query: `
        CREATE TABLE IF NOT EXISTS event_log (
            id UUID,
            project_id String,
            type String,
            payload String,
            timestamp DateTime,
            status_code Nullable(Int32),
            outcome Nullable(String)
        ) ENGINE = MergeTree()
        ORDER BY (project_id, timestamp)
        `
    })
}
