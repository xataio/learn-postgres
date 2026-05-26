#!/usr/bin/env tsx
/**
 * Scaffolds a new lesson inside a module:
 *   /lessons/<NN-module>/<NN-lesson>/{lesson.yaml,lesson.mdx,seed.sql}
 *
 * The lesson's order is the next free number within that module — adding a
 * lesson never renumbers lessons in other modules.
 *
 * Usage:
 *   npm run new-lesson -- <module-slug> <lesson-slug>
 *
 * Example:
 *   npm run new-lesson -- changing-data delete-and-lifecycle
 */

import { mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { slugRegex, parseOrderedName } from "../lib/lesson-schema";

const LESSONS_DIR = join(process.cwd(), "lessons");

function titleize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Resolves the on-disk folder name (e.g. "02-changing-data") for a module slug.
async function findModuleDir(moduleSlug: string): Promise<string | null> {
  if (!existsSync(LESSONS_DIR)) return null;
  const entries = await readdir(LESSONS_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const parsed = parseOrderedName(e.name);
    if (parsed?.slug === moduleSlug) return e.name;
  }
  return null;
}

async function nextLessonOrder(moduleDirPath: string): Promise<number> {
  const entries = await readdir(moduleDirPath, { withFileTypes: true });
  let max = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const parsed = parseOrderedName(e.name);
    if (parsed) max = Math.max(max, parsed.order);
  }
  return max + 1;
}

async function main() {
  const moduleSlug = process.argv[2];
  const lessonSlug = process.argv[3];
  if (!moduleSlug || !lessonSlug) {
    console.error("usage: npm run new-lesson -- <module-slug> <lesson-slug>");
    process.exit(2);
  }
  if (!slugRegex.test(lessonSlug)) {
    console.error(
      `"${lessonSlug}" is not a valid slug. Use lowercase letters, digits, hyphens.`,
    );
    process.exit(2);
  }

  const moduleDir = await findModuleDir(moduleSlug);
  if (!moduleDir) {
    console.error(
      `No module "${moduleSlug}" found. Create lessons/NN-${moduleSlug}/module.yaml first.`,
    );
    process.exit(2);
  }
  const moduleDirPath = join(LESSONS_DIR, moduleDir);

  const order = await nextLessonOrder(moduleDirPath);
  const prefix = String(order).padStart(2, "0");
  const lessonFolder = `${prefix}-${lessonSlug}`;
  const dir = join(moduleDirPath, lessonFolder);
  if (existsSync(dir)) {
    console.error(`lesson already exists at ${dir}`);
    process.exit(2);
  }

  const title = titleize(lessonSlug);

  await mkdir(dir, { recursive: true });

  await writeFile(
    join(dir, "lesson.yaml"),
    `title: ${title}
summary: One-line description of what the learner will do.
difficulty: beginner
estimatedMinutes: 10
tags: []
authors: []
seed: seed.sql
checks: []
`,
  );

  await writeFile(
    join(dir, "lesson.mdx"),
    `Brief intro — what the learner will do, in two sentences.

## First section

Explain the concept.

<Run>
SELECT 1;
</Run>

<Check id="example-check">
Describe what the learner should verify. Reference the check id in lesson.yaml.
</Check>

## What you learned

- bullet
- bullet
`,
  );

  await writeFile(
    join(dir, "seed.sql"),
    `-- Seed for "${lessonSlug}".
-- Keep this idempotent-when-fresh: assume an empty branch.

CREATE TABLE example (
  id serial PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO example (name) VALUES ('hello'), ('world');
`,
  );

  console.log(`✓ Scaffolded /lessons/${moduleDir}/${lessonFolder}`);
  console.log("  Edit lesson.yaml, lesson.mdx, and seed.sql, then:");
  console.log("    npm run lessons:validate");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
