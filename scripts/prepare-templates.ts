#!/usr/bin/env tsx

/**
 * Deploy-time template preparation.
 *
 * For every lesson, ensure a pre-seeded template branch named
 * `tpl-<slug>-<seedHash>` exists in the Xata sandbox project. User sandboxes
 * fork from these templates (inheriting the seeded data) instead of forking
 * from `main` and seeding per request — moving seed cost off the user path and
 * letting some lessons ship much larger seeds.
 *
 * Idempotent: a template is treated as ready only if its exact-hash name
 * exists AND carries the success marker (`COMMENT ON DATABASE` =
 * `lp-template:<seedHash>`), so unchanged seeds are skipped, changed seeds get
 * a brand-new template, and a prior failed seed is rebuilt instead of being
 * skipped forever.
 *
 * Also keeps the parent and existing templates on the latest available
 * Postgres minor of the parent's current major (minor upgrades are in-place
 * and data-compatible). Usually a noop; failures there only warn, since the
 * next deploy retries.
 *
 * Fatal: exits non-zero on any failure so a deploy never ships a lesson whose
 * template couldn't be built.
 *
 * Reads XATA_API_KEY / XATA_ORG_ID / XATA_PROJECT_ID (the sandbox project) and,
 * optionally, XATA_PARENT_BRANCH (defaults to "main").
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import { load } from "js-yaml";
import { Client } from "pg";
import { discoverLessons } from "../lib/lesson-discovery";
import { lessonFileSchema } from "../lib/lesson-schema";
import { seedHash, templateBranchName } from "../lib/templates";
import {
  awaitConnectionString,
  createBranch,
  deleteBranch,
  getBranch,
  listAvailableImages,
  listBranches,
  resolveBranchDsn,
  updateBranchImage,
  type XataBranch,
} from "../lib/xata-rest";

// Match Next.js env-loading order for local runs; no-op on Vercel where the
// vars already live in process.env.
config({ path: ".env.local" });
config({ path: ".env" });

const SEED_TIMEOUT_MS = 5 * 60_000;
const MARKER_PREFIX = "lp-template:";
const MARKER_CONNECT_TIMEOUT_MS = 5_000;
const MARKER_CHECK_TIMEOUT_MS = 30_000;
const MARKER_CHECK_CONCURRENCY = 4;

type LessonSeed = { slug: string; seedSql: string };

function templateMarker(hash: string): string {
  return `${MARKER_PREFIX}${hash}`;
}

async function loadLessonSeeds(): Promise<LessonSeed[]> {
  const entries = await discoverLessons();

  const lessons: LessonSeed[] = [];
  for (const { slug, dir } of entries) {
    const yamlPath = join(dir, "lesson.yaml");
    if (!existsSync(yamlPath)) throw new Error(`${slug}: missing lesson.yaml`);
    const meta = lessonFileSchema.parse(load(await readFile(yamlPath, "utf8")));
    const seedPath = join(dir, meta.seed);
    const seedSql = existsSync(seedPath)
      ? await readFile(seedPath, "utf8")
      : "";
    if (!seedSql.trim())
      throw new Error(`${slug}: seed "${meta.seed}" is empty`);
    lessons.push({ slug, seedSql });
  }
  return lessons.sort((a, b) => a.slug.localeCompare(b.slug));
}

function resolveMainParent(branches: XataBranch[]): string {
  const target = process.env.XATA_PARENT_BRANCH ?? "main";
  const match =
    branches.find((b) => b.id === target) ??
    branches.find((b) => b.name === target);
  if (!match) {
    throw new Error(
      `Could not find parent branch "${target}". Set XATA_PARENT_BRANCH to a valid branch name or id.`,
    );
  }
  return match.id;
}

type ParsedImage = { offering: string; major: number; minor: number };

function parseImage(image: string): ParsedImage | null {
  const m = /^([^:]+):(\d+)\.(\d+)$/.exec(image);
  return m
    ? { offering: m[1], major: Number(m[2]), minor: Number(m[3]) }
    : null;
}

/**
 * Upgrade the parent and every existing tpl-* branch to the latest available
 * minor of the parent's current major/offering. The parent goes first so
 * templates created later in this run inherit the new image. Only warns on
 * failure — an upgrade that doesn't land just retries on the next deploy.
 */
async function upgradeBranchImages(
  parentId: string,
  branches: XataBranch[],
): Promise<void> {
  let parent: XataBranch;
  let latest: (ParsedImage & { name: string }) | undefined;
  try {
    parent = await getBranch(parentId);
    const parentImage = parent.configuration?.image;
    const current = parentImage ? parseImage(parentImage) : null;
    if (!parentImage || !current) {
      console.warn(
        `  ! parent image "${parentImage}" is missing or unparsable — skipping Postgres upgrades`,
      );
      return;
    }
    for (const img of await listAvailableImages()) {
      const p = parseImage(img.name);
      if (!p || p.offering !== current.offering || p.major !== current.major)
        continue;
      if (!latest || p.minor > latest.minor) latest = { ...p, name: img.name };
    }
    if (!latest || latest.minor <= current.minor) {
      console.log(`Postgres image ${parentImage} is the latest available.`);
      // The parent is current, but templates created before an earlier upgrade
      // may still lag — fall through and check them too.
      latest = { ...current, name: parentImage };
    }
  } catch (err) {
    console.warn(
      `  ! could not resolve Postgres images (${(err as Error).message}) — skipping upgrades`,
    );
    return;
  }

  const templates = branches.filter(
    (b) => b.name.startsWith("tpl-") && b.id !== parent.id,
  );
  let upgraded = 0;
  for (const b of [parent, ...templates]) {
    try {
      const detail = b.id === parent.id ? parent : await getBranch(b.id);
      const image = detail.configuration?.image;
      if (!image || image === latest.name) continue;
      const cur = parseImage(image);
      if (
        !cur ||
        cur.offering !== latest.offering ||
        cur.major !== latest.major ||
        cur.minor >= latest.minor
      ) {
        console.warn(
          `  ! ${detail.name}: ${image} not upgradable to ${latest.name} — skipping`,
        );
        continue;
      }
      console.log(`  ^ ${detail.name}: ${image} → ${latest.name}`);
      await updateBranchImage(detail.id, latest.name);
      upgraded++;
    } catch (err) {
      console.warn(
        `  ! ${b.name}: image upgrade failed (${(err as Error).message})`,
      );
    }
  }
  if (upgraded > 0) {
    console.log(`Upgraded ${upgraded} branch(es) to ${latest.name}.\n`);
  }
}

async function writeTemplateMarker(
  client: Client,
  hash: string,
): Promise<void> {
  // Marker is `lp-template:` + hex seedHash — safe to embed. Avoid $1 in
  // format(): Postgres cannot infer the param type for variadic format args
  // ("could not determine data type of parameter $1").
  const marker = templateMarker(hash);
  await client.query(`
    DO $do$
    BEGIN
      EXECUTE format(
        'COMMENT ON DATABASE %I IS %L',
        current_database(),
        '${marker}'
      );
    END
    $do$
  `);
}

/**
 * Run the seed against a freshly-created template branch over plain TCP `pg`
 * (no statement_timeout cap — large seeds are the point). Retries while Xata
 * propagates the branch credentials, until the deadline. Writes the success
 * marker as the last step so existence alone never implies a finished seed.
 */
async function seedTemplate(
  dsn: string,
  seedSql: string,
  hash: string,
): Promise<void> {
  const sql = seedSql.trim();
  const deadline = Date.now() + SEED_TIMEOUT_MS;
  let attempt = 0;
  let lastError: unknown;
  while (Date.now() < deadline) {
    attempt++;
    const client = new Client({
      connectionString: dsn,
      // Deploy-time connection to our own freshly-provisioned Xata branch.
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30_000,
    });
    try {
      await client.connect();
      await client.query(sql);
      await writeTemplateMarker(client, hash);
      await client.end();
      if (attempt > 1) console.log(`    seeded on attempt ${attempt}`);
      return;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => {});
      const msg = (err as Error).message ?? String(err);
      // Seed SQL may have partially applied; retrying DDL ("already exists")
      // cannot recover — fail so the caller deletes the incomplete branch.
      const code = (err as { code?: string }).code;
      if (code === "42P07" || /already exists/i.test(msg)) throw err;
      const left = deadline - Date.now();
      if (left <= 0) break;
      console.warn(`    attempt ${attempt} failed (${msg}) — retrying`);
      await new Promise((r) =>
        setTimeout(r, Math.min(1000 * attempt, 5000, left)),
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function resolveExistingTemplateDsn(branch: XataBranch): Promise<string> {
  const detail = await getBranch(branch.id);
  const connectionString = await awaitConnectionString(
    branch.id,
    detail.connectionString,
  );
  return resolveBranchDsn(branch.id, connectionString);
}

/**
 * Confirm the template carries the expected success marker. Returns false when
 * the marker is missing or wrong (caller may delete + recreate). Throws when
 * the branch can't be reached — connection errors must not trigger delete.
 */
async function verifyTemplateMarker(
  branch: XataBranch,
  hash: string,
): Promise<boolean> {
  const dsn = await resolveExistingTemplateDsn(branch);
  const expected = templateMarker(hash);
  const deadline = Date.now() + MARKER_CHECK_TIMEOUT_MS;
  let attempt = 0;
  let lastError: unknown;
  while (Date.now() < deadline) {
    attempt++;
    const client = new Client({
      connectionString: dsn,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: MARKER_CONNECT_TIMEOUT_MS,
    });
    try {
      await client.connect();
      const { rows } = await client.query<{ comment: string | null }>(
        `SELECT shobj_description(oid, 'pg_database') AS comment
         FROM pg_database WHERE datname = current_database()`,
      );
      await client.end();
      return rows[0]?.comment === expected;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => {});
      const msg = (err as Error).message ?? String(err);
      const left = deadline - Date.now();
      if (left <= 0) break;
      console.warn(
        `    marker check attempt ${attempt} for ${branch.name} failed (${msg}) — retrying`,
      );
      await new Promise((r) =>
        setTimeout(r, Math.min(1000 * attempt, 3000, left)),
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(
        `Could not verify seed marker for ${branch.name}: ${String(lastError)}`,
      );
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  }
  const n = Math.min(concurrency, items.length);
  if (n === 0) return;
  await Promise.all(Array.from({ length: n }, () => worker()));
}

async function main() {
  const lessons = await loadLessonSeeds();
  if (lessons.length === 0) {
    console.log("No lessons found — nothing to prepare.");
    return;
  }

  const branches = await listBranches();
  const parentId = resolveMainParent(branches);
  await upgradeBranchImages(parentId, branches);
  const byName = new Map(branches.map((b) => [b.name, b]));
  const existing = new Set(branches.map((b) => b.name));

  // Check markers first; delete only right before recreate for that lesson.
  const markerOk = new Map<string, boolean>();
  const toVerify = lessons.flatMap((lesson) => {
    const name = templateBranchName(lesson.slug, lesson.seedSql);
    const branch = byName.get(name);
    return branch ? [{ lesson, name, branch }] : [];
  });
  if (toVerify.length > 0) {
    console.log(
      `Checking ${toVerify.length} existing template(s) for seed markers…`,
    );
  }
  await runPool(
    toVerify,
    MARKER_CHECK_CONCURRENCY,
    async ({ lesson, name, branch }) => {
      markerOk.set(
        name,
        await verifyTemplateMarker(branch, seedHash(lesson.seedSql)),
      );
    },
  );

  let created = 0;
  let skipped = 0;
  for (const lesson of lessons) {
    const name = templateBranchName(lesson.slug, lesson.seedSql);
    const hash = seedHash(lesson.seedSql);
    if (existing.has(name)) {
      if (markerOk.get(name)) {
        console.log(`  = ${name} (up-to-date)`);
        skipped++;
        continue;
      }
      const stale = byName.get(name);
      if (stale) {
        console.log(`  ! ${name} — missing or stale seed marker, deleting`);
        await deleteBranch(stale.id);
      }
    }

    console.log(`  + ${name} — creating from parent ${parentId}`);
    const branch = await createBranch({
      name,
      parentId,
      description: lesson.slug.slice(0, 50),
    });
    try {
      const connectionString = await awaitConnectionString(
        branch.id,
        branch.connectionString,
      );
      const dsn = await resolveBranchDsn(branch.id, connectionString);
      await seedTemplate(dsn, lesson.seedSql, hash);
      console.log(`    seeded ${name} (${branch.id})`);
      created++;
    } catch (err) {
      try {
        await deleteBranch(branch.id);
        console.warn(
          `  ! ${name} — create/seed failed, deleted incomplete branch`,
        );
      } catch (deleteErr) {
        console.warn(
          `  ! ${name} — failed to delete incomplete branch ${branch.id}: ${(deleteErr as Error).message}`,
        );
      }
      throw err;
    }
  }

  console.log(`\nTemplates ready: ${created} created, ${skipped} up-to-date.`);
}

main().catch((err) => {
  console.error(`Template preparation failed: ${(err as Error).message}`);
  console.error(err);
  process.exit(1);
});
