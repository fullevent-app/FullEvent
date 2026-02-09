import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
    dialect: "turso",
    schema: "./lib/auth-schema.ts",
    out: "./drizzle",
    dbCredentials: {
        // Default to local Docker Turso for development
        url: process.env.TURSO_DATABASE_URL || "http://localhost:18080",
        authToken: process.env.TURSO_AUTH_TOKEN,
    },
});
