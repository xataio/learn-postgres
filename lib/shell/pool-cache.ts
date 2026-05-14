import "server-only";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Per-DSN connection-pool cache. Each user's shell talks to their own Xata
 * branch; the first query per (instance, branch) pays the WebSocket handshake
 * and every subsequent query is just the round trip.
 *
 * We use Xata's serverless proxy via @neondatabase/serverless — same DSN as
 * the regular TCP endpoint, but the protocol is WebSocket (faster cold start
 * than TCP+TLS+pg startup, and Edge-Runtime ready if we ever move there).
 *
 *   https://xata.io/docs/core-concepts/serverless-proxy
 *
 * On Node we hand the driver the `ws` package as its WebSocket constructor;
 * on Edge/browser native `WebSocket` is used automatically.
 */

if (typeof WebSocket === "undefined") {
  // Don't overwrite if some other module already configured the driver.
  if (!neonConfig.webSocketConstructor) {
    neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
  }
}

const MAX_POOLS = 100;
const MAX_PER_POOL = 3;
const POOL_IDLE_MS = 60_000;
const STATEMENT_TIMEOUT_MS = 5_000;

type Entry = { pool: Pool; lastUsed: number };

const globalForPools = globalThis as unknown as {
  __learnPgPools?: Map<string, Entry>;
};

const pools: Map<string, Entry> =
  globalForPools.__learnPgPools ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== "production") {
  globalForPools.__learnPgPools = pools;
}

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of pools) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  }
  if (oldestKey) {
    const victim = pools.get(oldestKey);
    pools.delete(oldestKey);
    victim?.pool.end().catch(() => { });
  }
}

function getPool(dsn: string): Pool {
  const existing = pools.get(dsn);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.pool;
  }

  const pool = new Pool({
    connectionString: dsn,
    max: MAX_PER_POOL,
    idleTimeoutMillis: POOL_IDLE_MS,
    // statement_timeout at session startup so we don't issue a SET per query.
    options: `-c statement_timeout=${STATEMENT_TIMEOUT_MS}`,
  });
  pool.on("error", (err: Error & { code?: string }) => {
    console.error(
      `[pg-pool] idle client error: ${err.message || err.code || String(err)}`,
    );
  });

  pools.set(dsn, { pool, lastUsed: Date.now() });
  if (pools.size > MAX_POOLS) evictOldest();
  return pool;
}

function hostFromDsn(dsn: string): string {
  const m = dsn.match(/^(?:postgres(?:ql)?:\/\/)?(?:[^@/]*@)?([^/?:\s]+)/);
  return m?.[1] ?? "<unparseable>";
}

export async function acquireClient(
  dsn: string,
  timeoutMs = 30_000,
): Promise<PoolClient> {
  const pool = getPool(dsn);
  const host = hostFromDsn(dsn);
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastError: unknown;
  while (Date.now() < deadline) {
    attempt++;
    try {
      const client = await pool.connect();
      if (attempt > 1) {
        console.log(
          `[pg-pool] ${host} acquired after ${attempt} attempt(s)`,
        );
      }
      return client;
    } catch (err) {
      lastError = err;
      const detail =
        err instanceof Error ? err.message : String(err);
      console.error(
        `[pg-pool] ${host} acquire attempt ${attempt} failed: ${detail}`,
      );
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const wait = Math.min(250 * attempt, 1500, remaining);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  const finalDetail =
    lastError instanceof Error ? lastError.message : String(lastError);
  console.error(
    `[pg-pool] ${host} gave up after ${attempt} attempt(s) in ${timeoutMs}ms: ${finalDetail}`,
  );
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

export async function dropPool(dsn: string): Promise<void> {
  const entry = pools.get(dsn);
  if (!entry) return;
  pools.delete(dsn);
  await entry.pool.end().catch(() => { });
}
