import "server-only";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";
import { load } from "js-yaml";
import {
  lessonFileSchema,
  type Check,
  type LessonMeta,
  type ModuleMeta,
} from "./lesson-schema";
import { discoverLessons, type LessonEntry } from "./lesson-discovery";

export type Lesson = {
  meta: LessonMeta;
  dir: string;
  mdxSource: string;
  seedSql: string;
};

async function loadOne(entry: LessonEntry): Promise<Lesson> {
  const { dir, slug, order, module: moduleMeta } = entry;
  const yamlPath = join(dir, "lesson.yaml");
  const mdxPath = join(dir, "lesson.mdx");

  if (!existsSync(yamlPath)) throw new Error(`${slug}: missing lesson.yaml`);
  if (!existsSync(mdxPath)) throw new Error(`${slug}: missing lesson.mdx`);

  const file = lessonFileSchema.parse(load(await readFile(yamlPath, "utf8")));
  const meta: LessonMeta = { ...file, slug, order, module: moduleMeta };

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
  const entries = await discoverLessons();
  const lessons = await Promise.all(entries.map(loadOne));
  return lessons.sort(
    (a, b) =>
      a.meta.module.order - b.meta.module.order || a.meta.order - b.meta.order,
  );
});

export const getLesson = cache(async (slug: string): Promise<Lesson | null> => {
  const lessons = await getAllLessons();
  return lessons.find((l) => l.meta.slug === slug) ?? null;
});

export type ModuleWithLessons = { module: ModuleMeta; lessons: Lesson[] };

export const getModules = cache(async (): Promise<ModuleWithLessons[]> => {
  const lessons = await getAllLessons();
  const groups: ModuleWithLessons[] = [];
  for (const lesson of lessons) {
    let group = groups.find((g) => g.module.slug === lesson.meta.module.slug);
    if (!group) {
      group = { module: lesson.meta.module, lessons: [] };
      groups.push(group);
    }
    group.lessons.push(lesson);
  }
  return groups;
});

export function getCheckById(lesson: Lesson, id: string): Check | undefined {
  return lesson.meta.checks.find((c) => c.id === id);
}
