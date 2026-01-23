import { ensureSchema, clickhouse } from '../lib/clickhouse.js'

async function main() {
    console.log('🚀 Initializing ClickHouse schema...')
    console.log('   Database:', process.env.CLICKHOUSE_DB || 'default')
    console.log('   Host:', process.env.CLICKHOUSE_HOST || 'http://localhost:8123')
    console.log('')

    // 1. Create the main events table
    await ensureSchema()

    // Verify the table was created
    const result = await clickhouse.query({
        query: `DESCRIBE TABLE events`,
        format: 'JSONEachRow',
    })
    const columns = await result.json() as Array<{ name: string; type: string }>

    console.log('')
    console.log('📋 Events table structure:')
    for (const col of columns) {
        console.log(`   ${col.name}: ${col.type}`)
    }

    // 2. Create usage tracking tables
    console.log('')
    console.log('📊 Setting up usage tracking...')

    // Create daily aggregation table
    await clickhouse.command({
        query: `
            CREATE TABLE IF NOT EXISTS daily_usage (
                project_id String,
                day Date,
                count UInt64
            ) ENGINE = SummingMergeTree()
            ORDER BY (project_id, day)
        `
    })
    console.log('   ✅ Created table daily_usage')

    // Create materialized view for automatic aggregation
    await clickhouse.command({
        query: `
            CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_mv TO daily_usage AS
            SELECT 
                _project_id AS project_id,
                toStartOfDay(_timestamp) AS day,
                count() AS count
            FROM events
            GROUP BY _project_id, day
        `
    })
    console.log('   ✅ Created materialized view daily_usage_mv')

    console.log('')
    console.log('✅ Schema initialized successfully!')
    process.exit(0)
}

main().catch(err => {
    console.error('❌ Failed to initialize schema:', err)
    process.exit(1)
})
