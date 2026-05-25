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
 * Idempotent: a template is created only if its exact-hash name is missing, so
 * unchanged seeds are skipped and changed seeds get a brand-new template.
 *
 * Fatal: exits non-zero on any failure so a deploy never ships a lesson whose
 * template couldn't be built.
 *
 * Reads XATA_API_KEY / XATA_ORG_ID / XATA_PROJECT_ID (the sandbox project) and,
 * optionally, XATA_PARENT_BRANCH (defaults to "main").
 */

import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { Client } from "pg";
import { lessonMetaSchema } from "../lib/lesson-schema";
import { templateBranchName } from "../lib/templates";
import {
  awaitConnectionString,
  createBranch,
  listBranches,
  resolveBranchDsn,
  type XataBranch,
} from "../lib/xata-rest";

// Match Next.js env-loading order for local runs; no-op on Vercel where the
// vars already live in process.env.
config({ path: ".env.local" });
config({ path: ".env" });

const LESSONS_DIR = join(process.cwd(), "lessons");
const SEED_TIMEOUT_MS = 5 * 60_000;

type LessonSeed = { slug: string; seedSql: string };

async function loadLessonSeeds(): Promise<LessonSeed[]> {
  if (!existsSync(LESSONS_DIR)) return [];
  const entries = await readdir(LESSONS_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const lessons: LessonSeed[] = [];
  for (const slug of slugs) {
    const dir = join(LESSONS_DIR, slug);
    const yamlPath = join(dir, "lesson.yaml");
    if (!existsSync(yamlPath)) throw new Error(`${slug}: missing lesson.yaml`);
    const meta = lessonMetaSchema.parse(yaml.load(await readFile(yamlPath, "utf8")));
    if (meta.slug !== slug) {
      throw new Error(`${slug}: lesson.yaml slug "${meta.slug}" does not match folder`);
    }
    const seedPath = join(dir, meta.seed);
    const seedSql = existsSync(seedPath) ? await readFile(seedPath, "utf8") : "";
    if (!seedSql.trim()) throw new Error(`${slug}: seed "${meta.seed}" is empty`);
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

/**
 * Run the seed against a freshly-created template branch over plain TCP `pg`
 * (no statement_timeout cap — large seeds are the point). Retries while Xata
 * propagates the branch credentials, until the deadline.
 */
async function seedTemplate(dsn: string, seedSql: string): Promise<void> {
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
      await client.end();
      if (attempt > 1) console.log(`    seeded on attempt ${attempt}`);
      return;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => {});
      const msg = (err as Error).message ?? String(err);
      const left = deadline - Date.now();
      if (left <= 0) break;
      console.warn(`    attempt ${attempt} failed (${msg}) — retrying`);
      await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000, left)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  const lessons = await loadLessonSeeds();
  if (lessons.length === 0) {
    console.log("No lessons found — nothing to prepare.");
    return;
  }

  const branches = await listBranches();
  const parentId = resolveMainParent(branches);
  const existing = new Set(branches.map((b) => b.name));

  let created = 0;
  let skipped = 0;
  for (const lesson of lessons) {
    const name = templateBranchName(lesson.slug, lesson.seedSql);
    if (existing.has(name)) {
      console.log(`  = ${name} (up-to-date)`);
      skipped++;
      continue;
    }

    console.log(`  + ${name} — creating from parent ${parentId}`);
    const branch = await createBranch({
      name,
      parentId,
      description: lesson.slug.slice(0, 50),
    });
    const connectionString = await awaitConnectionString(
      branch.id,
      branch.connectionString,
    );
    const dsn = await resolveBranchDsn(branch.id, connectionString);
    await seedTemplate(dsn, lesson.seedSql);
    console.log(`    seeded ${name} (${branch.id})`);
    created++;
  }

  console.log(`\nTemplates ready: ${created} created, ${skipped} up-to-date.`);
}

main().catch((err) => {
  console.error(`Template preparation failed: ${(err as Error).message}`);
  console.error(err);
  process.exit(1);
});
