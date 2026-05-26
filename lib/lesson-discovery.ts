import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import {
  moduleFileSchema,
  parseOrderedName,
  type ModuleMeta,
} from "./lesson-schema";

/**
 * Walks the nested lessons tree and returns one entry per lesson, each carrying
 * its derived slug/order and resolved module. Module identity, title, and order
 * are discovered from the directory layout + each module's module.yaml — never
 * hardcoded. Pure (no `server-only`) so both the server runtime and the build
 * scripts can share the same discovery + validation logic.
 *
 * Layout:
 *   lessons/<NN-module-slug>/module.yaml
 *   lessons/<NN-module-slug>/<NN-lesson-slug>/{lesson.yaml,lesson.mdx,seed.sql}
 */

export const LESSONS_DIR = join(process.cwd(), "lessons");

export type LessonEntry = {
  module: ModuleMeta;
  /** Absolute path to the lesson folder. */
  dir: string;
  slug: string;
  order: number;
};

export async function discoverLessons(): Promise<LessonEntry[]> {
  if (!existsSync(LESSONS_DIR)) return [];

  const moduleDirs = (
    await readdir(LESSONS_DIR, { withFileTypes: true })
  ).filter((e) => e.isDirectory());

  const entries: LessonEntry[] = [];
  const moduleSlugs = new Set<string>();
  const moduleOrders = new Map<number, string>();
  const lessonSlugs = new Map<string, string>();

  for (const modDir of moduleDirs) {
    const parsedMod = parseOrderedName(modDir.name);
    if (!parsedMod) {
      throw new Error(
        `module folder "${modDir.name}" must be named "NN-slug" (e.g. 01-query-fundamentals)`,
      );
    }
    if (moduleSlugs.has(parsedMod.slug)) {
      throw new Error(`duplicate module slug "${parsedMod.slug}"`);
    }
    moduleSlugs.add(parsedMod.slug);
    const prevOrder = moduleOrders.get(parsedMod.order);
    if (prevOrder) {
      throw new Error(
        `module order ${parsedMod.order} used by both "${prevOrder}" and "${modDir.name}"`,
      );
    }
    moduleOrders.set(parsedMod.order, modDir.name);

    const moduleDirPath = join(LESSONS_DIR, modDir.name);
    const moduleYamlPath = join(moduleDirPath, "module.yaml");
    if (!existsSync(moduleYamlPath)) {
      throw new Error(`${modDir.name}: missing module.yaml`);
    }
    const moduleFile = moduleFileSchema.parse(
      yaml.load(await readFile(moduleYamlPath, "utf8")),
    );
    const moduleMeta: ModuleMeta = {
      slug: parsedMod.slug,
      order: parsedMod.order,
      title: moduleFile.title,
      summary: moduleFile.summary,
    };

    const lessonDirs = (
      await readdir(moduleDirPath, { withFileTypes: true })
    ).filter((e) => e.isDirectory());

    const lessonOrders = new Map<number, string>();
    for (const lessonDir of lessonDirs) {
      const parsedLesson = parseOrderedName(lessonDir.name);
      if (!parsedLesson) {
        throw new Error(
          `${modDir.name}/${lessonDir.name}: lesson folder must be named "NN-slug"`,
        );
      }
      const prevLessonOrder = lessonOrders.get(parsedLesson.order);
      if (prevLessonOrder) {
        throw new Error(
          `${modDir.name}: lesson order ${parsedLesson.order} used by both "${prevLessonOrder}" and "${lessonDir.name}"`,
        );
      }
      lessonOrders.set(parsedLesson.order, lessonDir.name);

      const owner = lessonSlugs.get(parsedLesson.slug);
      if (owner) {
        throw new Error(
          `duplicate lesson slug "${parsedLesson.slug}" (in "${owner}" and "${modDir.name}/${lessonDir.name}")`,
        );
      }
      lessonSlugs.set(parsedLesson.slug, `${modDir.name}/${lessonDir.name}`);

      entries.push({
        module: moduleMeta,
        dir: join(moduleDirPath, lessonDir.name),
        slug: parsedLesson.slug,
        order: parsedLesson.order,
      });
    }
  }

  return entries;
}
