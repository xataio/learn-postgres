import "server-only";
import type { PoolClient } from "@neondatabase/serverless";
import type { Check } from "@/lib/lesson-schema";
import { acquireClient } from "@/lib/shell/pool-cache";

export type CheckResult = { pass: true } | { pass: false; reason: string };

const CONNECT_TIMEOUT_MS = 30_000;

async function withClient<T>(
  dsn: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await acquireClient(dsn, CONNECT_TIMEOUT_MS);
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  return String(v);
}

function rowsMatch(observed: unknown[][], expected: unknown[][]): boolean {
  if (observed.length !== expected.length) return false;
  for (let i = 0; i < observed.length; i++) {
    const o = observed[i];
    const e = expected[i];
    if (o.length !== e.length) return false;
    for (let j = 0; j < o.length; j++) {
      if (asString(o[j]) !== asString(e[j])) return false;
    }
  }
  return true;
}

async function checkQueryReturns(
  dsn: string,
  check: Extract<Check, { type: "query-returns" }>,
): Promise<CheckResult> {
  return withClient(dsn, async (client) => {
    let result;
    try {
      result = await client.query({ text: check.sql, rowMode: "array" });
    } catch (err) {
      return { pass: false, reason: `Query failed: ${(err as Error).message}` };
    }

    const rows = result.rows ?? [];
    if (check.expect.rowCount !== undefined && rows.length !== check.expect.rowCount) {
      return {
        pass: false,
        reason: `Expected ${check.expect.rowCount} row(s), got ${rows.length}.`,
      };
    }
    if (check.expect.rows !== undefined && !rowsMatch(rows, check.expect.rows)) {
      return {
        pass: false,
        reason: "Returned rows didn't match the expected values.",
      };
    }
    return { pass: true };
  });
}

async function checkRowCount(
  dsn: string,
  check: Extract<Check, { type: "row-count" }>,
): Promise<CheckResult> {
  return withClient(dsn, async (client) => {
    try {
      const result = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${quoteIdent(check.table)}`,
      );
      const actual = Number(result.rows[0]?.count ?? "0");
      if (actual !== check.expect.rowCount) {
        return {
          pass: false,
          reason: `Table ${check.table} has ${actual} row(s); expected ${check.expect.rowCount}.`,
        };
      }
      return { pass: true };
    } catch (err) {
      return {
        pass: false,
        reason: `Couldn't count rows of ${check.table}: ${(err as Error).message}`,
      };
    }
  });
}

async function checkSchemaState(
  dsn: string,
  check: Extract<Check, { type: "schema-state" }>,
): Promise<CheckResult> {
  return withClient(dsn, async (client) => {
    try {
      const result = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = $1
           AND column_name = $2`,
        [check.table, check.column],
      );
      if (result.rows.length === 0) {
        return {
          pass: false,
          reason: `Column ${check.table}.${check.column} not found.`,
        };
      }
      const observed = (result.rows[0].data_type ?? "").toLowerCase();
      const expected = check.columnType.toLowerCase();
      if (!observed.startsWith(expected)) {
        return {
          pass: false,
          reason: `Column ${check.table}.${check.column} has type ${observed}; expected ${expected}.`,
        };
      }
      return { pass: true };
    } catch (err) {
      return {
        pass: false,
        reason: `Schema lookup failed: ${(err as Error).message}`,
      };
    }
  });
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function runCheck(
  dsn: string,
  check: Check,
): Promise<CheckResult> {
  switch (check.type) {
    case "query-returns":
      return checkQueryReturns(dsn, check);
    case "row-count":
      return checkRowCount(dsn, check);
    case "schema-state":
      return checkSchemaState(dsn, check);
  }
}
