import "server-only";
import { createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { Client } from "pg";
import { db } from "@/lib/db";
import { userBranch } from "@/db/schema";
import type { Lesson } from "@/lib/lessons";
import {
  XataApiError,
  buildBranchDsn,
  createBranch,
  deleteBranch,
  getBranch,
  getCredentials,
  getParentBranchId,
  readCredentialsFromDsn,
  rotateCredentials,
} from "@/lib/xata";
import { dropPool } from "@/lib/shell/pool-cache";

export type UserBranchRow = typeof userBranch.$inferSelect;

const XATA_NAME_MAX = 63;

function shortUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

function buildBranchName(userId: string, lessonSlug: string): string {
  const prefix = `lp-${shortUserId(userId)}-`;
  // Short timestamp suffix so reset() never collides with the just-dropped
  // branch — Xata's delete can be eventually consistent.
  const suffix = `-${Date.now().toString(36).slice(-6)}`;
  const middle = lessonSlug.slice(
    0,
    XATA_NAME_MAX - prefix.length - suffix.length,
  );
  return prefix + middle + suffix;
}

async function createBranchWith409Retry(input: {
  name: string;
  parentId: string;
  description?: string;
}) {
  try {
    return await createBranch(input);
  } catch (err) {
    if (err instanceof XataApiError && err.status === 409) {
      const altSuffix = Math.random().toString(36).slice(2, 8);
      return await createBranch({ ...input, name: `${input.name}-${altSuffix}` });
    }
    throw err;
  }
}

/**
 * Pull the connection string for an existing row that's missing one — usually
 * a row written before the create-time polling fix landed. Returns the healed
 * row, or null if we couldn't recover (caller should drop + recreate).
 */
async function healMissingConnectionString(
  row: UserBranchRow,
): Promise<UserBranchRow | null> {
  if (!row.xataBranchId) return null;

  console.log(
    `[heal] polling Xata for connection string for branch ${row.xataBranchId}`,
  );
  let connectionString: string;
  try {
    connectionString = await awaitConnectionString(row.xataBranchId, null);
  } catch (err) {
    console.error(
      `[heal] connection string still null after polling: ${(err as Error).message}`,
    );
    return null;
  }

  let dsn: string;
  try {
    dsn = await resolveBranchDsn(row.xataBranchId, connectionString);
  } catch (err) {
    console.error(`[heal] could not resolve DSN: ${(err as Error).message}`);
    return null;
  }

  const [updated] = await db
    .update(userBranch)
    .set({ connectionString: dsn, lastUsedAt: new Date() })
    .where(
      and(
        eq(userBranch.userId, row.userId),
        eq(userBranch.lessonSlug, row.lessonSlug),
      ),
    )
    .returning();
  console.log(
    `[heal] row repaired for branch ${row.xataBranchId}`,
  );
  return updated;
}

/**
 * After a successful create-branch call, Xata sometimes still returns a null
 * `connectionString` because the branch is still being provisioned. Poll the
 * branch details with backoff until it's populated.
 */
async function awaitConnectionString(
  branchId: string,
  initial: string | null | undefined,
  timeoutMs = 60_000,
): Promise<string> {
  if (initial) return initial;

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    const remaining = deadline - Date.now();
    const wait = Math.min(500 + 500 * attempt, 3000, remaining);
    await new Promise((r) => setTimeout(r, wait));
    let updated;
    try {
      updated = await getBranch(branchId);
    } catch (err) {
      console.error(
        `[branch-create] poll attempt ${attempt} for ${branchId} failed: ${(err as Error).message}`,
      );
      continue;
    }
    if (updated.connectionString) {
      if (attempt > 1) {
        console.log(
          `[branch-create] ${branchId} connection string ready after ${attempt} poll(s)`,
        );
      }
      return updated.connectionString;
    }
  }
  throw new Error(
    `Xata never returned a connection string for branch ${branchId} (timed out after ${timeoutMs}ms)`,
  );
}

async function findExisting(
  userId: string,
  lessonSlug: string,
): Promise<UserBranchRow | undefined> {
  const rows = await db
    .select()
    .from(userBranch)
    .where(
      and(
        eq(userBranch.userId, userId),
        eq(userBranch.lessonSlug, lessonSlug),
      ),
    )
    .limit(1);
  return rows[0];
}

async function touchLastUsed(userId: string, lessonSlug: string) {
  await db
    .update(userBranch)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(userBranch.userId, userId),
        eq(userBranch.lessonSlug, lessonSlug),
      ),
    );
}

/**
 * Resolve a usable Postgres DSN for a freshly-created Xata branch.
 *
 * Xata's create-branch response sometimes already embeds credentials in
 * `connectionString`; when it doesn't, we have to fetch them from the
 * credentials endpoint. If that endpoint 400s (Xata hasn't issued credentials
 * for this role yet), trigger a rotate and try once more.
 */
async function resolveBranchDsn(
  branchId: string,
  connectionString: string,
): Promise<string> {
  const inline = readCredentialsFromDsn(connectionString);
  if (inline) return connectionString;

  try {
    const creds = await getCredentials(branchId);
    return buildBranchDsn(connectionString, creds);
  } catch (err) {
    if (err instanceof XataApiError && err.status === 400) {
      await rotateCredentials(branchId);
      const creds = await getCredentials(branchId);
      return buildBranchDsn(connectionString, creds);
    }
    throw err;
  }
}

/**
 * Connect with a deadline. Xata sometimes hands you valid credentials a moment
 * before Postgres on the branch accepts them — we retry transient failures
 * (auth not yet propagated, port not open) but never SQL errors.
 */
async function connectWithRetry(
  dsn: string,
  timeoutMs = 10_000,
): Promise<Client> {
  const deadline = Date.now() + timeoutMs;
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
      return client;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => {});
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const wait = Math.min(250 * attempt, 1500, remaining);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Could not connect to branch within ${timeoutMs}ms: ${message}`);
}

async function runSeed(dsn: string, sql: string): Promise<void> {
  const trimmed = sql.trim();
  if (!trimmed) return;

  const client = await connectWithRetry(dsn);
  try {
    await client.query(trimmed);
  } finally {
    await client.end();
  }
}

/**
 * Ensure the calling user has a Postgres branch for this lesson. Creates +
 * seeds one the first time; subsequent calls reuse and refresh last_used_at.
 *
 * Throws if Xata isn't configured or seed/create fails.
 */
export async function ensureBranchForLesson(
  userId: string,
  lesson: Lesson,
): Promise<UserBranchRow> {
  let existing = await findExisting(userId, lesson.meta.slug);

  // Heal stale rows: when create-branch originally returned a null
  // connectionString and the polling fix wasn't in place yet, rows can be
  // stored with an empty DSN. Re-fetch the connection string from Xata
  // before falling back to a full recreate.
  if (existing && !existing.connectionString) {
    const healed = await healMissingConnectionString(existing);
    if (healed) return healed;
    console.warn(
      `[ensure-branch] could not heal row for user=${userId} lesson=${lesson.meta.slug} — dropping and recreating`,
    );
    await dropBranchForLesson(userId, lesson.meta.slug);
    existing = undefined;
  }

  if (existing) {
    await touchLastUsed(userId, lesson.meta.slug);
    return existing;
  }

  const parentId = await getParentBranchId();
  const name = buildBranchName(userId, lesson.meta.slug);
  const branch = await createBranchWith409Retry({
    name,
    parentId,
    description: lesson.meta.slug.slice(0, 50),
  });

  let connectionString: string;
  try {
    connectionString = await awaitConnectionString(
      branch.id,
      branch.connectionString,
    );
  } catch (err) {
    await deleteBranch(branch.id).catch(() => {});
    throw err;
  }

  let dsn: string;
  try {
    dsn = await resolveBranchDsn(branch.id, connectionString);
  } catch (err) {
    await deleteBranch(branch.id).catch(() => {});
    throw err;
  }

  try {
    await runSeed(dsn, lesson.seedSql);
  } catch (err) {
    await deleteBranch(branch.id).catch(() => {});
    throw new Error(
      `Seed for ${lesson.meta.slug} failed: ${(err as Error).message}`,
    );
  }

  try {
    const [row] = await db
      .insert(userBranch)
      .values({
        userId,
        lessonSlug: lesson.meta.slug,
        xataBranchId: branch.id,
        xataBranchName: branch.name,
        connectionString: dsn,
      })
      .returning();
    return row;
  } catch (err) {
    // Concurrent request already inserted; drop ours and reuse theirs.
    await deleteBranch(branch.id).catch(() => {});
    const existingAfterRace = await findExisting(userId, lesson.meta.slug);
    if (existingAfterRace) return existingAfterRace;
    throw err;
  }
}

/**
 * Drop the user's branch for a lesson (Xata + local row).
 * Silent no-op if the row doesn't exist.
 */
export async function dropBranchForLesson(
  userId: string,
  lessonSlug: string,
): Promise<void> {
  const row = await findExisting(userId, lessonSlug);
  if (!row) return;

  if (row.connectionString) await dropPool(row.connectionString);
  await deleteBranch(row.xataBranchId).catch(() => {});
  await db
    .delete(userBranch)
    .where(
      and(
        eq(userBranch.userId, userId),
        eq(userBranch.lessonSlug, lessonSlug),
      ),
    );
}

/**
 * Drop + recreate the branch (used by the "Reset lesson" button).
 */
export async function resetBranchForLesson(
  userId: string,
  lesson: Lesson,
): Promise<UserBranchRow> {
  await dropBranchForLesson(userId, lesson.meta.slug);
  return ensureBranchForLesson(userId, lesson);
}

export type CleanupResult = {
  scanned: number;
  dropped: number;
  errors: { branchId: string; message: string }[];
};

/**
 * Cron-driven cleanup: drop branches that haven't been touched in `idleDays`.
 */
export async function cleanupIdleBranches(
  idleDays = 7,
): Promise<CleanupResult> {
  const cutoff = new Date(Date.now() - idleDays * 24 * 60 * 60 * 1000);
  const idle = await db
    .select()
    .from(userBranch)
    .where(lt(userBranch.lastUsedAt, cutoff));

  const result: CleanupResult = {
    scanned: idle.length,
    dropped: 0,
    errors: [],
  };

  for (const row of idle) {
    try {
      if (row.connectionString) await dropPool(row.connectionString);
      await deleteBranch(row.xataBranchId);
      await db
        .delete(userBranch)
        .where(
          and(
            eq(userBranch.userId, row.userId),
            eq(userBranch.lessonSlug, row.lessonSlug),
          ),
        );
      result.dropped++;
    } catch (err) {
      result.errors.push({
        branchId: row.xataBranchId,
        message: (err as Error).message,
      });
    }
  }

  return result;
}
