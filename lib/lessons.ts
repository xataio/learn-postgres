import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";
import yaml from "js-yaml";
import { lessonMetaSchema, type Check, type LessonMeta } from "./lesson-schema";

export type Lesson = {
  meta: LessonMeta;
  dir: string;
  mdxSource: string;
  seedSql: string;
};

const LESSONS_DIR = join(process.cwd(), "lessons");

async function loadOne(slug: string): Promise<Lesson> {
  const dir = join(LESSONS_DIR, slug);
  const yamlPath = join(dir, "lesson.yaml");
  const mdxPath = join(dir, "lesson.mdx");

  if (!existsSync(yamlPath)) throw new Error(`${slug}: missing lesson.yaml`);
  if (!existsSync(mdxPath)) throw new Error(`${slug}: missing lesson.mdx`);

  const rawYaml = await readFile(yamlPath, "utf8");
  const parsed = yaml.load(rawYaml);
  const meta = lessonMetaSchema.parse(parsed);

  if (meta.slug !== slug) {
    throw new Error(
      `${slug}: lesson.yaml slug "${meta.slug}" does not match folder name`,
    );
  }

  const mdxSource = await readFile(mdxPath, "utf8");

  const seedPath = join(dir, meta.seed);
  const seedSql = existsSync(seedPath) ? await readFile(seedPath, "utf8") : "";

  // checks must have unique IDs
  const ids = new Set<string>();
  for (const c of meta.checks) {
    if (ids.has(c.id)) throw new Error(`${slug}: duplicate check id "${c.id}"`);
    ids.add(c.id);
  }

  return { meta, dir, mdxSource, seedSql };
}

export const getAllLessons = cache(async (): Promise<Lesson[]> => {
  if (!existsSync(LESSONS_DIR)) return [];
  const entries = await readdir(LESSONS_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const lessons = await Promise.all(slugs.map(loadOne));
  return lessons.sort((a, b) => a.meta.order - b.meta.order);
});

export const getLesson = cache(async (slug: string): Promise<Lesson | null> => {
  try {
    return await loadOne(slug);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
});

export function getCheckById(lesson: Lesson, id: string): Check | undefined {
  return lesson.meta.checks.find((c) => c.id === id);
}
