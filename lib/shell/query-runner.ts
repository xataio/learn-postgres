import "server-only";
import type { QueryArrayResult } from "pg";

type PgNotice = { severity?: string; message?: string };
import type { QueryResult, ResultBlock } from "./types";
import { acquireClient } from "./pool-cache";

export type {
  QueryResult,
  ResultBlock,
  FieldInfo,
  QueryOk,
  QueryErr,
} from "./types";

export const MAX_ROWS = 1000;
const DEFAULT_CONNECT_TIMEOUT_MS = 30_000;

function connectTimeoutMs(): number {
  const raw = process.env.BRANCH_CONNECT_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CONNECT_TIMEOUT_MS;
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
  const m = dsn.match(/^(?:postgres(?:ql)?:\/\/)?(?:[^@/]*@)?([^/?:\s]+)/);
  return m?.[1] ?? "<unparseable>";
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

  const host = hostFromDsn(dsn);
  const acquireStart = Date.now();
  let client;
  try {
    client = await acquireClient(dsn, connectTimeoutMs());
  } catch (err) {
    const detail = describeConnectError(err);
    console.error(`[branch-connect] ${host} acquire failed: ${detail}`);
    return { ok: false, error: `Could not connect to branch: ${detail}` };
  }
  const waitedMs = Date.now() - acquireStart;
  if (waitedMs > 1000) {
    console.log(`[branch-connect] ${host} acquired after ${waitedMs}ms`);
  }

  const notices: string[] = [];
  const onNotice = (n: PgNotice) => {
    const parts = [n.severity, n.message].filter(Boolean);
    notices.push(parts.join(": "));
  };
  client.on("notice", onNotice);

  const start = performance.now();
  try {
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
    console.error(`[query]${codePart} ${e.message ?? String(err)}`);
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
    client.off("notice", onNotice);
    client.release();
  }
}
