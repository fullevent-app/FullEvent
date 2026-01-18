import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "sqlite",
    schema: "./lib/auth-schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL || "file:sqlite.db",
    },
});
