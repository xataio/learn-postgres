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

export const lessonMetaSchema = z.object({
  slug: z.string().regex(slugRegex),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  difficulty: difficultySchema,
  estimatedMinutes: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  authors: z.array(z.string()).default([]),
  summary: z.string().optional(),
  seed: z.string().default("seed.sql"),
  checks: z.array(checkSchema).default([]),
});

export type LessonMeta = z.infer<typeof lessonMetaSchema>;
export type Check = z.infer<typeof checkSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
