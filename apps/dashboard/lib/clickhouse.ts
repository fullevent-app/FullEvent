import { createClient } from '@clickhouse/client'

export const clickhouse = createClient({
    url: process.env.CLICKHOUSE_HOST || 'https://add8zw68er.us-east-2.aws.clickhouse.cloud:8443',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DB || 'default',
    request_timeout: 30_000,
})
