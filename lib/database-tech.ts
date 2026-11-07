import "server-only";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { load } from "js-yaml";
import { z } from "zod";

export const DATABASE_TECH_URL = "https://database.tech";
export const LEARN_URL = "https://learn.database.tech";

export const SECTIONS = ["problems", "concepts"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  problems: "Problems",
  concepts: "Concepts",
};

const CONTENT_DIR = join(process.cwd(), "content", "site");

const introSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const pageSchema = introSchema.extend({
  order: z.number().default(100),
  related: z.array(z.string()).default([]),
  lessons: z
    .array(z.object({ slug: z.string(), anchor: z.string() }))
    .default([]),
});

export type SiteIntro = z.infer<typeof introSchema> & { body: string };
export type SitePage = z.infer<typeof pageSchema> & {
  section: Section;
  slug: string;
  path: string;
  body: string;
};

export const isSection = (value: string): value is Section =>
  (SECTIONS as readonly string[]).includes(value);

export const isIndexable = () => process.env.DATABASE_TECH_INDEXABLE === "true";

export const sitePath = (path: string) =>
  process.env.VERCEL_ENV === "production"
    ? path
    : `/site${path === "/" ? "" : path}`;

export const canonicalUrl = (path: string) =>
  `${DATABASE_TECH_URL}${path === "/" ? "" : path}`;

const splitFrontmatter = (source: string) => {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
  if (!match) throw new Error("missing frontmatter");
  return { data: load(match[1]), body: match[2] };
};

const readIntro = async (file: string): Promise<SiteIntro | null> => {
  const fullPath = join(CONTENT_DIR, file);
  if (!existsSync(fullPath)) return null;
  const { data, body } = splitFrontmatter(await readFile(fullPath, "utf8"));
  return { ...introSchema.parse(data), body };
};

export const getHome = () => readIntro("home.mdx");

export const getSectionIntro = (section: Section) =>
  readIntro(join(section, "_index.mdx"));

export const getSectionPages = async (
  section: Section,
): Promise<SitePage[]> => {
  const dir = join(CONTENT_DIR, section);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter(
    (file) => file.endsWith(".mdx") && !file.startsWith("_"),
  );
  const pages = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "");
      const { data, body } = splitFrontmatter(
        await readFile(join(dir, file), "utf8"),
      );
      return {
        ...pageSchema.parse(data),
        section,
        slug,
        path: `/${section}/${slug}`,
        body,
      };
    }),
  );
  return pages.sort(
    (a, b) => a.order - b.order || a.slug.localeCompare(b.slug),
  );
};

export const getAllPages = async () =>
  (await Promise.all(SECTIONS.map(getSectionPages))).flat();

export const getPage = async (section: Section, slug: string) =>
  (await getSectionPages(section)).find((page) => page.slug === slug) ?? null;
