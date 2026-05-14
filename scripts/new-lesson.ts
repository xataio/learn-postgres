#!/usr/bin/env tsx
/**
 * Scaffolds a new lesson folder: /lessons/<slug>/{lesson.yaml,lesson.mdx,seed.sql}.
 *
 * Usage:
 *   npm run new-lesson -- <slug>
 *
 * Example:
 *   npm run new-lesson -- 03-joins-basics
 */

import { mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { slugRegex } from "../lib/lesson-schema";

const LESSONS_DIR = join(process.cwd(), "lessons");

async function nextOrder(): Promise<number> {
  if (!existsSync(LESSONS_DIR)) return 1;
  const entries = await readdir(LESSONS_DIR, { withFileTypes: true });
  let max = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const m = e.name.match(/^(\d+)-/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("usage: npm run new-lesson -- <slug>");
    process.exit(2);
  }
  if (!slugRegex.test(slug)) {
    console.error(
      `"${slug}" is not a valid slug. Use lowercase letters, digits, hyphens.`,
    );
    process.exit(2);
  }

  const dir = join(LESSONS_DIR, slug);
  if (existsSync(dir)) {
    console.error(`lesson "${slug}" already exists at ${dir}`);
    process.exit(2);
  }

  const order = await nextOrder();
  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  await mkdir(dir, { recursive: true });

  await writeFile(
    join(dir, "lesson.yaml"),
    `slug: ${slug}
title: ${title}
summary: One-line description of what the learner will do.
order: ${order}
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
    `-- Seed for "${slug}".
-- Keep this idempotent-when-fresh: assume an empty branch.

CREATE TABLE example (
  id serial PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO example (name) VALUES ('hello'), ('world');
`,
  );

  console.log(`✓ Scaffolded /lessons/${slug}`);
  console.log("  Edit lesson.yaml, lesson.mdx, and seed.sql, then:");
  console.log("    npm run lessons:validate");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
