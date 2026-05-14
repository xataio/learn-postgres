import "server-only";
import { Client, type QueryArrayResult } from "pg";
import type { QueryResult, ResultBlock } from "./types";

export type { QueryResult, ResultBlock, FieldInfo, QueryOk, QueryErr } from "./types";

export const MAX_ROWS = 1000;
const STATEMENT_TIMEOUT_MS = 5_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 30_000;

function connectTimeoutMs(): number {
  const raw = process.env.BRANCH_CONNECT_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CONNECT_TIMEOUT_MS;
}

type ConnectErrorDetails = Error & {
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
  hostname?: string;
};

function describeConnectError(err: unknown): string {
  if (err === null || err === undefined) return "no error details";
  if (typeof err === "string") return err || "(empty error)";
  if (err instanceof Error) {
    const e = err as ConnectErrorDetails;
    const base = e.message?.trim() || e.name || e.constructor?.name || "Error";
    const parts: string[] = [base];
    if (e.code) parts.push(`code=${e.code}`);
    if (typeof e.errno === "number") parts.push(`errno=${e.errno}`);
    if (e.syscall) parts.push(`syscall=${e.syscall}`);
    if (e.address)
      parts.push(`address=${e.address}${e.port ? `:${e.port}` : ""}`);
    else if (e.hostname) parts.push(`host=${e.hostname}`);
    return parts.join(" ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function hostFromDsn(dsn: string): string {
  // Use a regex rather than `new URL()` — pg's connection-string parser is
  // looser about special characters in passwords, so URL parsing can fail on
  // DSNs that pg accepts. postgres[ql]://[user[:pw]@]host[:port]/...
  const m = dsn.match(/^(?:postgres(?:ql)?:\/\/)?(?:[^@/]*@)?([^/?:\s]+)/);
  return m?.[1] ?? "<unparseable>";
}

/**
 * Open a Postgres connection, transparently retrying through Xata's
 * scale-to-zero cold start. A pg.Client can only be connected once, so we
 * create a fresh one for every attempt.
 */
async function createAndConnect(dsn: string): Promise<Client> {
  const timeoutMs = connectTimeoutMs();
  const deadline = Date.now() + timeoutMs;
  const host = hostFromDsn(dsn);
  let attempt = 0;
  let lastError: unknown;

  while (Date.now() < deadline) {
    attempt++;
    const client = new Client({
      connectionString: dsn,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      if (attempt > 1) {
        console.log(
          `[branch-connect] ${host} ready after ${attempt} attempt(s)`,
        );
      }
      return client;
    } catch (err) {
      lastError = err;
      console.error(
        `[branch-connect] ${host} attempt ${attempt} failed: ${describeConnectError(err)}`,
      );
      await client.end().catch(() => {});
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const wait = Math.min(250 * attempt, 1500, remaining);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const detail = describeConnectError(lastError);
  const message = `gave up after ${attempt} attempt(s) in ${timeoutMs}ms — ${detail}`;
  console.error(`[branch-connect] ${host} ${message}`);
  throw new Error(message);
}

function serializeRow(row: unknown[]): unknown[] {
  return row.map((v) => {
    if (v === null) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "bigint") return v.toString();
    if (Buffer.isBuffer(v)) return `\\x${v.toString("hex")}`;
    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return v;
  });
}

function normalize(
  result: QueryArrayResult | QueryArrayResult[],
): ResultBlock[] {
  const list = Array.isArray(result) ? result : [result];
  return list.map((r) => {
    const allRows = r.rows ?? [];
    const truncated = allRows.length > MAX_ROWS;
    const rows = truncated ? allRows.slice(0, MAX_ROWS) : allRows;
    return {
      command: r.command ?? null,
      fields: (r.fields ?? []).map((f) => ({
        name: f.name,
        dataTypeID: f.dataTypeID,
      })),
      rows: rows.map(serializeRow),
      rowCount: r.rowCount ?? rows.length,
      truncated,
    };
  });
}

export async function runQuery(
  dsn: string,
  sql: string,
): Promise<QueryResult> {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: true, results: [], notices: [], durationMs: 0 };
  }

  let client: Client;
  try {
    client = await createAndConnect(dsn);
  } catch (err) {
    return {
      ok: false,
      error: `Could not connect to branch: ${(err as Error).message}`,
    };
  }

  const notices: string[] = [];
  client.on("notice", (n) => {
    const parts = [n.severity, n.message].filter(Boolean);
    notices.push(parts.join(": "));
  });

  const start = performance.now();
  try {
    await client.query(`SET statement_timeout TO ${STATEMENT_TIMEOUT_MS}`);

    const result = (await client.query({
      text: trimmed,
      rowMode: "array",
    })) as QueryArrayResult | QueryArrayResult[];

    return {
      ok: true,
      results: normalize(result),
      notices,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const e = err as {
      message?: string;
      severity?: string;
      code?: string;
      hint?: string;
      detail?: string;
      position?: string;
    };
    const codePart = e.code ? ` [${e.code}]` : "";
    console.error(
      `[query]${codePart} ${e.message ?? String(err)}`,
    );
    return {
      ok: false,
      error: e.message ?? String(err),
      severity: e.severity,
      code: e.code,
      hint: e.hint,
      detail: e.detail,
      position: e.position ? Number(e.position) : undefined,
    };
  } finally {
    await client.end().catch(() => {});
  }
}
