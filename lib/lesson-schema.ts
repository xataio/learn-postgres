import { z } from "zod";

export const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const baseExpect = z.object({
  rowCount: z.number().int().nonnegative().optional(),
  rows: z.array(z.array(z.unknown())).optional(),
});

export const checkSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().regex(slugRegex),
    type: z.literal("query-returns"),
    description: z.string().optional(),
    sql: z.string().min(1),
    expect: baseExpect,
  }),
  z.object({
    id: z.string().regex(slugRegex),
    type: z.literal("row-count"),
    description: z.string().optional(),
    table: z.string().min(1),
    expect: z.object({ rowCount: z.number().int().nonnegative() }),
  }),
  z.object({
    id: z.string().regex(slugRegex),
    type: z.literal("schema-state"),
    description: z.string().optional(),
    table: z.string().min(1),
    column: z.string().min(1),
    columnType: z.string().min(1),
  }),
]);

export const difficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

// Editorial fields authored in lesson.yaml. `slug` and `order` are NOT here —
// they are derived from the lesson's folder name (the single source of truth).
export const lessonFileSchema = z.object({
  title: z.string().min(1),
  difficulty: difficultySchema,
  estimatedMinutes: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  authors: z.array(z.string()).default([]),
  summary: z.string().optional(),
  seed: z.string().default("seed.sql"),
  checks: z.array(checkSchema).default([]),
});

// Fields authored in a module's module.yaml. Slug/order come from the folder name.
export const moduleFileSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
});

export type LessonFile = z.infer<typeof lessonFileSchema>;
export type ModuleMeta = {
  slug: string;
  order: number;
  title: string;
  summary?: string;
};
export type LessonMeta = LessonFile & {
  slug: string;
  order: number;
  module: ModuleMeta;
};
export type Check = z.infer<typeof checkSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;

// Parses an ordered folder name like "01-select-basics" into its numeric order
// and slug. Returns null when the name lacks an `NN-` prefix or the remainder
// is not a valid slug.
export function parseOrderedName(
  name: string,
): { order: number; slug: string } | null {
  const m = name.match(/^(\d+)-(.+)$/);
  if (!m) return null;
  const slug = m[2];
  if (!slugRegex.test(slug)) return null;
  return { order: parseInt(m[1], 10), slug };
}
