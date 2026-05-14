#!/usr/bin/env tsx
/**
 * Validates every lesson under /lessons:
 *   - lesson.yaml parses and matches the Zod schema
 *   - folder name matches yaml `slug`
 *   - lesson.mdx exists and compiles
 *   - seed file exists and has non-empty SQL (basic sanity, not parsed)
 *   - check IDs are unique within a lesson
 *
 * Exits non-zero on any failure. Designed for CI.
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { lessonMetaSchema, slugRegex } from "../lib/lesson-schema";

const LESSONS_DIR = join(process.cwd(), "lessons");

type Result = { slug: string; ok: boolean; errors: string[] };

async function validateOne(slug: string): Promise<Result> {
  const errors: string[] = [];
  const dir = join(LESSONS_DIR, slug);

  if (!slugRegex.test(slug)) {
    errors.push(`folder name "${slug}" is not a valid slug`);
  }

  const yamlPath = join(dir, "lesson.yaml");
  const mdxPath = join(dir, "lesson.mdx");

  if (!existsSync(yamlPath)) errors.push("missing lesson.yaml");
  if (!existsSync(mdxPath)) errors.push("missing lesson.mdx");
  if (errors.length) return { slug, ok: false, errors };

  let meta;
  try {
    const raw = yaml.load(await readFile(yamlPath, "utf8"));
    meta = lessonMetaSchema.parse(raw);
  } catch (err) {
    errors.push(`lesson.yaml invalid: ${(err as Error).message}`);
    return { slug, ok: false, errors };
  }

  if (meta.slug !== slug) {
    errors.push(`yaml slug "${meta.slug}" does not match folder name "${slug}"`);
  }

  const seenIds = new Set<string>();
  for (const c of meta.checks) {
    if (seenIds.has(c.id)) errors.push(`duplicate check id "${c.id}"`);
    seenIds.add(c.id);
  }

  const seedPath = join(dir, meta.seed);
  if (!existsSync(seedPath)) {
    errors.push(`seed file "${meta.seed}" not found`);
  } else {
    const sql = (await readFile(seedPath, "utf8")).trim();
    if (sql.length === 0) errors.push(`seed file "${meta.seed}" is empty`);
  }

  // Surface-level MDX sanity. Real compile-validation runs at `next build` time,
  // where the actual MDX pipeline is exercised.
  try {
    const mdx = await readFile(mdxPath, "utf8");
    if (mdx.trim().length === 0) {
      errors.push("lesson.mdx is empty");
    }
    // Reject Check ids referenced by MDX that don't exist in the YAML.
    const referenced = new Set<string>();
    for (const m of mdx.matchAll(/<Check\s+[^>]*id\s*=\s*["']([^"']+)["']/g)) {
      referenced.add(m[1]);
    }
    const declared = new Set(meta.checks.map((c) => c.id));
    for (const id of referenced) {
      if (!declared.has(id)) {
        errors.push(`<Check id="${id}"> in MDX is not declared in lesson.yaml`);
      }
    }
  } catch (err) {
    errors.push(`could not read lesson.mdx: ${(err as Error).message}`);
  }

  return { slug, ok: errors.length === 0, errors };
}

async function main() {
  if (!existsSync(LESSONS_DIR)) {
    console.log("No /lessons directory — nothing to validate.");
    return;
  }

  const entries = await readdir(LESSONS_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (slugs.length === 0) {
    console.log("No lessons found.");
    return;
  }

  const results = await Promise.all(slugs.map(validateOne));
  results.sort((a, b) => a.slug.localeCompare(b.slug));

  let failures = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ ${r.slug}`);
    } else {
      failures++;
      console.log(`  ✗ ${r.slug}`);
      for (const e of r.errors) console.log(`      ${e}`);
    }
  }

  console.log(
    `\n${results.length - failures}/${results.length} lessons valid` +
      (failures > 0 ? ` (${failures} failed)` : ""),
  );

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
