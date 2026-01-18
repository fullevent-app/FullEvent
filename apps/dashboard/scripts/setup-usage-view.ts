import { config } from 'dotenv';
import path from 'path';

// Try loading from api env
const apiEnvPath = path.resolve(process.cwd(), '../api/.env');
console.log(`Loading env from: ${apiEnvPath}`);
config({ path: apiEnvPath });
config(); // Fallback

async function main() {
    // Dynamic import to ensure env vars are loaded first
    const { clickhouse } = await import('../lib/clickhouse');

    console.log('Running usage view setup (Daily Aggregation)...');

    try {
        // CLEANUP: Drop old monthly views if they exist
        console.log("Dropping old monthly tables...");
        await clickhouse.query({ query: "DROP VIEW IF EXISTS monthly_usage_mv" });
        await clickhouse.query({ query: "DROP TABLE IF EXISTS monthly_usage" });

        // 1. Create Daily Aggregation Table
        await clickhouse.query({
            query: `
                CREATE TABLE IF NOT EXISTS daily_usage (
                    project_id String,
                    day Date,
                    count UInt64
                ) ENGINE = SummingMergeTree()
                ORDER BY (project_id, day)
            `
        });
        console.log("Created table 'daily_usage'");

        // 2. Create Materialized View
        await clickhouse.query({
            query: `
                CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_mv TO daily_usage AS
                SELECT 
                    project_id,
                    toStartOfDay(timestamp) as day,
                    count() as count
                FROM event_log
                GROUP BY project_id, day
            `
        });
        console.log("Created materialized view 'daily_usage_mv'");

        // 3. Check for data and populate if empty
        const result = await clickhouse.query({
            query: "SELECT count() as count FROM daily_usage",
            format: 'JSONEachRow'
        });
        const rows = await result.json() as { count: string }[];
        const count = parseInt(rows[0]?.count || '0');

        if (count === 0) {
            console.log("Populating daily_usage from existing event_log...");
            // Backfill
            await clickhouse.query({
                query: `
                    INSERT INTO daily_usage
                    SELECT 
                        project_id,
                        toStartOfDay(timestamp) as day,
                        count() as count
                    FROM event_log
                    GROUP BY project_id, day
                `
            });
            console.log("Backfill complete.");
        } else {
            console.log("daily_usage already has data, skipping backfill.");
        }

        await clickhouse.close();
        console.log("Done.");

    } catch (e) {
        console.error("Error setting up usage view:", e);
    }
}

main();
