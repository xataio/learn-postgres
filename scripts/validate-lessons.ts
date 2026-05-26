#!/usr/bin/env tsx
/**
 * Validates every lesson under /lessons:
 *   - the module/lesson folder tree is well-formed (names, uniqueness, module.yaml)
 *   - lesson.yaml parses and matches the Zod schema
 *   - lesson.mdx exists and is non-empty
 *   - seed file exists and has non-empty SQL (basic sanity, not parsed)
 *   - check IDs are unique within a lesson
 *   - <Check id> referenced in MDX is declared in lesson.yaml
 *
 * Folder names are the source of truth for slug + order (see lesson-discovery),
 * so this no longer cross-checks a yaml `slug` field.
 *
 * Exits non-zero on any failure. Designed for CI.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { lessonFileSchema } from "../lib/lesson-schema";
import { discoverLessons, type LessonEntry } from "../lib/lesson-discovery";

type Result = { slug: string; ok: boolean; errors: string[] };

async function validateOne(entry: LessonEntry): Promise<Result> {
  const { slug, dir } = entry;
  const errors: string[] = [];

  const yamlPath = join(dir, "lesson.yaml");
  const mdxPath = join(dir, "lesson.mdx");

  if (!existsSync(yamlPath)) errors.push("missing lesson.yaml");
  if (!existsSync(mdxPath)) errors.push("missing lesson.mdx");
  if (errors.length) return { slug, ok: false, errors };

  let meta;
  try {
    meta = lessonFileSchema.parse(yaml.load(await readFile(yamlPath, "utf8")));
  } catch (err) {
    errors.push(`lesson.yaml invalid: ${(err as Error).message}`);
    return { slug, ok: false, errors };
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
  let entries: LessonEntry[];
  try {
    entries = await discoverLessons();
  } catch (err) {
    console.log("  ✗ lesson tree is malformed");
    console.log(`      ${(err as Error).message}`);
    process.exit(1);
  }

  if (entries.length === 0) {
    console.log("No lessons found.");
    return;
  }

  const results = await Promise.all(entries.map(validateOne));
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
