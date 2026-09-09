import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({ connectionString, max: 5 });
}

if (!globalForDb.pool) globalForDb.pool = createPool();
export const pool: Pool = globalForDb.pool;

if (!globalForDb.db) globalForDb.db = drizzle(pool, { schema });
export const db = globalForDb.db;

export type DB = typeof db;
