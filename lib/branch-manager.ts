import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { userBranch } from "@/db/schema";
import { getAllLessons, type Lesson } from "@/lib/lessons";
import {
  XataApiError,
  awaitConnectionString,
  createBranch,
  deleteBranch,
  getParentBranchId,
  getTemplateBranchId,
  listBranches,
  resolveBranchDsn,
} from "@/lib/xata";
import { templateBranchName } from "@/lib/templates";
import { acquireClient, dropPool } from "@/lib/shell/pool-cache";
import { enforceRate } from "@/lib/rate-limit";

export type UserBranchRow = typeof userBranch.$inferSelect;

const XATA_NAME_MAX = 63;
const DEFAULT_MAX_BRANCHES_PER_USER = 5;
const DEFAULT_BRANCH_CREATE_LIMIT = 5;
const DEFAULT_BRANCH_CREATE_WINDOW_MS = 60_000;

function branchCreateLimit(): { limit: number; windowMs: number } {
  const limitRaw = process.env.BRANCH_CREATE_LIMIT;
  const windowRaw = process.env.BRANCH_CREATE_WINDOW_MS;
  const limit = limitRaw ? Number(limitRaw) : NaN;
  const windowMs = windowRaw ? Number(windowRaw) : NaN;
  return {
    limit:
      Number.isFinite(limit) && limit >= 1
        ? Math.floor(limit)
        : DEFAULT_BRANCH_CREATE_LIMIT,
    windowMs:
      Number.isFinite(windowMs) && windowMs >= 1000
        ? Math.floor(windowMs)
        : DEFAULT_BRANCH_CREATE_WINDOW_MS,
  };
}

function maxBranchesPerUser(): number {
  const raw = process.env.MAX_BRANCHES_PER_USER;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 1
    ? Math.floor(parsed)
    : DEFAULT_MAX_BRANCHES_PER_USER;
}

/**
 * Enforce a per-user cap on active sandbox branches. Called just before
 * creating a new one — evicts the least-recently-used until there's room.
 */
async function enforceBranchQuota(userId: string): Promise<void> {
  const cap = maxBranchesPerUser();
  const rows = await db
    .select()
    .from(userBranch)
    .where(eq(userBranch.userId, userId))
    .orderBy(asc(userBranch.lastUsedAt));

  // Need room for one more after the create that's about to run.
  const overage = rows.length - (cap - 1);
  if (overage <= 0) return;

  const victims = rows.slice(0, overage);
  for (const row of victims) {
    console.log(
      `[quota] user=${shortUserId(userId)} evicting ${row.xataBranchName} (lesson=${row.lessonSlug})`,
    );
    if (row.connectionString) await dropPool(row.connectionString).catch(() => { });
    await deleteBranch(row.xataBranchId).catch(() => { });
    await db
      .delete(userBranch)
      .where(
        and(
          eq(userBranch.userId, userId),
          eq(userBranch.lessonSlug, row.lessonSlug),
        ),
      );
  }
}

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
 * Decide whether a seed failure is worth retrying. Retryable:
 *  - "authentication failed" / "password authentication" / "sasl" message —
 *    Xata's WS proxy rejects auth before the pg protocol starts, so there's
 *    often no SQLSTATE; match by text.
 *  - SQLSTATE class 28 (auth) and 08 (connection_exception)
 *  - any error without a SQLSTATE code — transport/WebSocket/network errors
 *    (undici TypeError, ws termination, ECONNRESET, etc.)
 * Non-retryable: any other SQLSTATE (syntax 42xxx, integrity 23xxx, …)
 * because re-running the same SQL won't change the outcome.
 */
function isRetryableSeedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  if (
    typeof e.message === "string" &&
    /authentication failed|password authentication|sasl/i.test(e.message)
  ) {
    return true;
  }
  const code = e.code;
  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
    return code.startsWith("28") || code.startsWith("08");
  }
  return true;
}

function describeErr(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as { message?: unknown; code?: unknown; name?: unknown };
  const msg = typeof e.message === "string" && e.message ? e.message : "<no msg>";
  const code = typeof e.code === "string" || typeof e.code === "number"
    ? ` code=${e.code}`
    : "";
  const name = typeof e.name === "string" && e.name !== "Error" ? `${e.name}: ` : "";
  return `${name}${msg}${code}`;
}

/**
 * Seed a freshly-created branch with the lesson's SQL. Retries transient
 * failures (auth propagation, dropped WS connections) until `timeoutMs`,
 * dropping the pool between attempts so each retry gets a fresh socket.
 * Throws the last error on deadline, or immediately on a non-retryable one.
 */
async function runSeed(
  dsn: string,
  sql: string,
  timeoutMs = 30_000,
): Promise<void> {
  const trimmed = sql.trim();
  if (!trimmed) return;

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastError: unknown;
  while (Date.now() < deadline) {
    attempt++;
    const remaining = deadline - Date.now();
    try {
      // Cap per-attempt acquire so the seed deadline fits multiple tries —
      // the pool's own 30s retry would otherwise eat the entire budget.
      const client = await acquireClient(dsn, Math.min(remaining, 8_000));
      try {
        await client.query(trimmed);
      } finally {
        client.release();
      }
      if (attempt > 1) {
        console.log(`[seed] succeeded on attempt ${attempt}`);
      }
      return;
    } catch (err) {
      lastError = err;
      if (!isRetryableSeedError(err)) {
        console.error(
          `[seed] attempt ${attempt} non-retryable: ${describeErr(err)}`,
        );
        throw err;
      }
      const left = deadline - Date.now();
      if (left <= 0) break;
      console.warn(
        `[seed] attempt ${attempt} failed (${describeErr(err)}) — dropping pool and retrying`,
      );
      await dropPool(dsn).catch(() => { });
      const wait = Math.min(500 * 2 ** (attempt - 1), 4_000, left);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

/**
 * Strip the password from a DSN for logging — keeps host + user so we can
 * tell whether Xata gave us the role we expected.
 */
function maskDsn(dsn: string): string {
  try {
    const url = new URL(dsn);
    const user = url.username || "<no-user>";
    return `${user}@${url.host}${url.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

/**
 * Ensure the calling user has a Postgres branch for this lesson. The first time,
 * it forks from the lesson's pre-seeded template branch (deploy-prepared) and
 * skips seeding entirely; if no template exists (e.g. local dev), it falls back
 * to forking from `main` and running the seed on demand. Subsequent calls reuse
 * the branch and refresh last_used_at.
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

  const tag = `[ensure-branch] user=${shortUserId(userId)} lesson=${lesson.meta.slug}`;

  // We're about to spin up a fresh Xata branch. Cap how often any single user
  // can do this — it's the expensive operation worth protecting.
  const { limit, windowMs } = branchCreateLimit();
  enforceRate(
    `branch-create:${userId}`,
    limit,
    windowMs,
    `Too many sandbox creations. Wait a moment and try again.`,
  );

  await enforceBranchQuota(userId);

  // Prefer forking from the lesson's pre-seeded template (data inherited at
  // fork time — no per-request seeding). Fall back to forking from `main` and
  // seeding on demand when the template is missing (local dev, prep not run).
  const templateName = templateBranchName(lesson.meta.slug, lesson.seedSql);
  const templateId = await getTemplateBranchId(templateName);
  const parentId = templateId ?? (await getParentBranchId());
  const skipSeed = templateId !== null;

  const name = buildBranchName(userId, lesson.meta.slug);
  let branch;
  try {
    branch = await createBranchWith409Retry({
      name,
      parentId,
      description: lesson.meta.slug.slice(0, 50),
    });
  } catch (err) {
    console.error(`${tag} create-branch failed: ${(err as Error).message}`);
    throw err;
  }
  console.log(
    `${tag} created branch ${branch.id} (${branch.name}) from ${
      skipSeed ? `template ${templateName}` : "main"
    }`,
  );

  let connectionString: string;
  try {
    connectionString = await awaitConnectionString(
      branch.id,
      branch.connectionString,
    );
  } catch (err) {
    console.error(
      `${tag} await-connection-string failed for ${branch.id}: ${(err as Error).message}`,
    );
    await deleteBranch(branch.id).catch(() => { });
    throw err;
  }

  let dsn: string;
  try {
    dsn = await resolveBranchDsn(branch.id, connectionString);
  } catch (err) {
    console.error(
      `${tag} resolve-dsn failed for ${branch.id}: ${(err as Error).message}`,
    );
    await deleteBranch(branch.id).catch(() => { });
    throw err;
  }

  if (!skipSeed) {
    try {
      await runSeed(dsn, lesson.seedSql);
    } catch (err) {
      console.error(
        `${tag} seed failed for ${branch.id} dsn=${maskDsn(dsn)}: ${(err as Error).message}`,
      );
      await deleteBranch(branch.id).catch(() => { });
      throw new Error(
        `Seed for ${lesson.meta.slug} failed: ${(err as Error).message}`,
      );
    }
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
        templateBranchId: templateId,
      })
      .returning();
    return row;
  } catch (err) {
    // Concurrent request already inserted; drop ours and reuse theirs.
    await deleteBranch(branch.id).catch(() => { });
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
  await deleteBranch(row.xataBranchId).catch(() => { });
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
  templates: { scanned: number; dropped: number };
  orphans: { scanned: number; dropped: number };
};

/**
 * Delete stale template branches: any `tpl-*` branch that is neither a current
 * lesson template (recomputed from the lessons on disk) nor still referenced by
 * a live `userBranch`. Safe regardless of whether Xata forks are full copies or
 * copy-on-write, since referenced templates are never removed.
 */
async function pruneStaleTemplates(
  errors: { branchId: string; message: string }[],
): Promise<{ scanned: number; dropped: number }> {
  const lessons = await getAllLessons();
  // Defensive: if we can't see any lessons, don't treat every template as
  // stale — that would delete current templates that simply have no live
  // sandboxes yet. Bail out of pruning instead.
  if (lessons.length === 0) return { scanned: 0, dropped: 0 };
  const current = new Set(
    lessons.map((l) => templateBranchName(l.meta.slug, l.seedSql)),
  );

  const referencedRows = await db
    .selectDistinct({ id: userBranch.templateBranchId })
    .from(userBranch)
    .where(isNotNull(userBranch.templateBranchId));
  const referenced = new Set(
    referencedRows.map((r) => r.id).filter((id): id is string => id !== null),
  );

  const templates = (await listBranches()).filter((b) =>
    b.name.startsWith("tpl-"),
  );

  let dropped = 0;
  for (const b of templates) {
    if (current.has(b.name) || referenced.has(b.id)) continue;
    try {
      await deleteBranch(b.id);
      dropped++;
    } catch (err) {
      errors.push({ branchId: b.id, message: (err as Error).message });
    }
  }
  return { scanned: templates.length, dropped };
}

// Untracked branches younger than this are skipped: an in-flight
// ensureBranchForLesson creates the Xata branch up to ~2 minutes before the
// userBranch row lands, and must not be swept mid-create.
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

/**
 * Delete orphaned Xata branches: anything that isn't the parent (`main`), a
 * `tpl-*` template (owned by pruneStaleTemplates), or referenced by a
 * `userBranch` row. Orphans accumulate when a delete fails after its row was
 * removed (delete errors are deliberately swallowed on the user path) or when
 * a create dies between createBranch and the row insert — the row-driven idle
 * pass never sees them again.
 */
async function sweepOrphanBranches(
  errors: { branchId: string; message: string }[],
): Promise<{ scanned: number; dropped: number }> {
  const parentId = await getParentBranchId();
  const parentName = process.env.XATA_PARENT_BRANCH ?? "main";
  const trackedRows = await db
    .select({ id: userBranch.xataBranchId })
    .from(userBranch);
  const tracked = new Set(trackedRows.map((r) => r.id));

  const branches = await listBranches();
  const cutoff = Date.now() - ORPHAN_GRACE_MS;

  let scanned = 0;
  let dropped = 0;
  for (const b of branches) {
    if (b.id === parentId || b.name === parentName) continue;
    if (b.name.startsWith("tpl-")) continue;
    if (tracked.has(b.id)) continue;
    scanned++;
    const createdAt = Date.parse(b.createdAt);
    if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;
    try {
      await deleteBranch(b.id);
      console.log(`[cleanup] dropped orphan branch ${b.id} (${b.name})`);
      dropped++;
    } catch (err) {
      errors.push({ branchId: b.id, message: (err as Error).message });
    }
  }
  return { scanned, dropped };
}

/**
 * Cron-driven cleanup: drop user branches that haven't been touched in
 * `idleDays`, prune template branches no longer referenced by any lesson or
 * live user branch, then sweep orphaned branches Xata knows about but the
 * local DB doesn't.
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
    templates: { scanned: 0, dropped: 0 },
    orphans: { scanned: 0, dropped: 0 },
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

  try {
    result.templates = await pruneStaleTemplates(result.errors);
  } catch (err) {
    result.errors.push({
      branchId: "<template-prune>",
      message: (err as Error).message,
    });
  }

  try {
    result.orphans = await sweepOrphanBranches(result.errors);
  } catch (err) {
    result.errors.push({
      branchId: "<orphan-sweep>",
      message: (err as Error).message,
    });
  }

  return result;
}
