import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Auth tables removed as we use Stack Auth for user management.
// We strictly manage Projects and API Keys here, linked to Stack Auth via userId string.

export const project = sqliteTable("project", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id").notNull(), // Stack Auth user ID (no FK - users managed externally)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const apikey = sqliteTable("apikey", {
    id: text("id").primaryKey(),
    name: text("name"),
    start: text("start"),
    prefix: text("prefix"),
    key: text("key").notNull(),
    userId: text("user_id").notNull(), // Stack Auth user ID (no FK - users managed externally)
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: integer("last_refill_at", { mode: "timestamp" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull(),
    rateLimitEnabled: integer("rate_limit_enabled", { mode: "boolean" }).notNull(),
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").notNull(),
    remaining: integer("remaining"),
    lastRequest: integer("last_request", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    permissions: text("permissions"),
    metadata: text("metadata"),
});

// eventLog table removed - logs are stored in ClickHouse
