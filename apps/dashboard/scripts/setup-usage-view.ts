import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve relative to the script location (in apps/dashboard/scripts)
const dashboardRoot = path.resolve(__dirname, '..');
const apiRoot = path.resolve(__dirname, '../../api');

// Try loading from .env.local first
const envLocalPath = path.resolve(dashboardRoot, '.env.local');
console.log(`Loading env from: ${envLocalPath}`);
config({ path: envLocalPath });

// Try loading from api env
const apiEnvPath = path.resolve(apiRoot, '.env');
console.log(`Loading env from: ${apiEnvPath}`);
config({ path: apiEnvPath });
config(); // Fallback

async function main() {
    // Dynamic import to ensure env vars are loaded first
    const { clickhouse } = await import('../lib/clickhouse.ts');

    console.log('🚀 Running usage view setup for V2 schema (Wide Events)...');

    try {
        // Create daily usage aggregation table
        await clickhouse.command({
            query: `
            CREATE TABLE IF NOT EXISTS daily_usage (
                project_id String,
                day Date,
                count SimpleAggregateFunction(sum, UInt64)
            ) ENGINE = AggregatingMergeTree()
            PARTITION BY toYYYYMM(day)
            ORDER BY (project_id, day)
        `
        });
        console.log("✅ Created table 'daily_usage'");

        // Create materialized view to populate it
        await clickhouse.command({
            query: `
            CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_mv TO daily_usage AS
            SELECT 
                _project_id as project_id,
                toDate(_timestamp) as day,
                count() as count
            FROM events
            GROUP BY _project_id, day
        `
        });
        console.log("✅ Created materialized view 'daily_usage_mv'");

        // Check if we need to backfill
        const result = await clickhouse.query({
            query: `SELECT count() as count FROM daily_usage`,
            format: 'JSONEachRow'
        });
        const rows = await result.json() as { count: string }[];
        const rowCount = parseInt(rows[0]?.count || '0');

        if (rowCount > 0) {
            console.log(`📊 daily_usage already has ${rowCount} rows, skipping backfill.`);
        } else {
            console.log('🔄 Backfilling daily_usage...');
            // Backfill from V2 events table
            await clickhouse.command({
                query: `
                    INSERT INTO daily_usage
                    SELECT 
                        _project_id as project_id,
                        toDate(_timestamp) as day,
                        count() as count
                    FROM events
                    GROUP BY _project_id, day
                `
            });
            console.log("✅ Backfill complete.");
        }

        await clickhouse.close();
        console.log("✅ Done.");

    } catch (e) {
        console.error("❌ Error setting up usage view:", e);
        process.exit(1);
    }
}

main();
