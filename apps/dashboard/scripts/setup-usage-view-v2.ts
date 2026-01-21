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

    console.log('🚀 Running usage view setup for V2 schema (Wide Events)...');

    try {
        // 1. Create Daily Aggregation Table for V2 schema
        await clickhouse.query({
            query: `
                CREATE TABLE IF NOT EXISTS daily_usage_v2 (
                    project_id String,
                    day Date,
                    count UInt64
                ) ENGINE = SummingMergeTree()
                ORDER BY (project_id, day)
            `
        });
        console.log("✅ Created table 'daily_usage_v2'");

        // 2. Create Materialized View that reads from V2 'events' table
        // Uses _project_id and _timestamp (V2 column names)
        await clickhouse.query({
            query: `
                CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_v2_mv TO daily_usage_v2 AS
                SELECT 
                    _project_id AS project_id,
                    toStartOfDay(_timestamp) AS day,
                    count() AS count
                FROM events
                GROUP BY _project_id, day
            `
        });
        console.log("✅ Created materialized view 'daily_usage_v2_mv'");

        // 3. Check for data and populate if empty
        const result = await clickhouse.query({
            query: "SELECT count() as count FROM daily_usage_v2",
            format: 'JSONEachRow'
        });
        const rows = await result.json() as { count: string }[];
        const count = parseInt(rows[0]?.count || '0');

        if (count === 0) {
            console.log("📊 Populating daily_usage_v2 from existing events...");
            // Backfill from V2 events table
            await clickhouse.query({
                query: `
                    INSERT INTO daily_usage_v2
                    SELECT 
                        _project_id AS project_id,
                        toStartOfDay(_timestamp) AS day,
                        count() AS count
                    FROM events
                    GROUP BY _project_id, day
                `
            });
            console.log("✅ Backfill complete.");
        } else {
            console.log(`📊 daily_usage_v2 already has ${count} rows, skipping backfill.`);
        }

        await clickhouse.close();
        console.log("✅ Done.");

    } catch (e) {
        console.error("❌ Error setting up usage view:", e);
        process.exit(1);
    }
}

main();
