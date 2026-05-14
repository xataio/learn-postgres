import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lessonProgress } from "@/db/schema";

export async function getPassedCheckIds(
  userId: string,
  lessonSlug: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ checkId: lessonProgress.checkId })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonSlug, lessonSlug),
      ),
    );
  return new Set(rows.map((r) => r.checkId));
}

export async function markCheckPassed(
  userId: string,
  lessonSlug: string,
  checkId: string,
): Promise<void> {
  await db
    .insert(lessonProgress)
    .values({ userId, lessonSlug, checkId })
    .onConflictDoNothing();
}

export async function getProgressCounts(
  userId: string,
  lessonSlugs: string[],
): Promise<Map<string, number>> {
  if (lessonSlugs.length === 0) return new Map();
  const rows = await db
    .select({
      lessonSlug: lessonProgress.lessonSlug,
      checkId: lessonProgress.checkId,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!lessonSlugs.includes(r.lessonSlug)) continue;
    counts.set(r.lessonSlug, (counts.get(r.lessonSlug) ?? 0) + 1);
  }
  return counts;
}
