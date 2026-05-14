import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Match Next.js env-loading order: .env.local wins, then .env.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
