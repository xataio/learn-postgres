import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { badgeShare, user } from "@/db/schema";
import { getModules } from "@/lib/lessons";
import { getProgressCounts } from "@/lib/lesson-progress";

export function newShareToken(): string {
  // 192 bits, URL-safe — unguessable enough to act as the only access control
  // on the public badge page.
  return randomBytes(24).toString("base64url");
}

export async function getShareForUser(
  userId: string,
): Promise<{ token: string; enabled: boolean } | null> {
  const rows = await db
    .select({ token: badgeShare.token, enabled: badgeShare.enabled })
    .from(badgeShare)
    .where(eq(badgeShare.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export type PublicBadge = {
  name: string;
  image: string | null;
  completedLessons: number;
  totalLessons: number;
  isCourseComplete: boolean;
  modules: { title: string; completed: number; total: number }[];
};

// Cached per request: generateMetadata and the page both call this.
export const getBadgeByToken = cache(
  async (token: string): Promise<PublicBadge | null> => {
    if (!token) return null;
    const rows = await db
      .select({ userId: user.id, name: user.name, image: user.image })
      .from(badgeShare)
      .innerJoin(user, eq(badgeShare.userId, user.id))
      .where(and(eq(badgeShare.token, token), eq(badgeShare.enabled, true)))
      .limit(1);
    const owner = rows[0];
    if (!owner) return null;

    const moduleGroups = await getModules();
    const allLessons = moduleGroups.flatMap((m) => m.lessons);
    const progress = await getProgressCounts(
      owner.userId,
      allLessons.map((l) => l.meta.slug),
    );

    const isLessonComplete = (slug: string, totalChecks: number) =>
      totalChecks > 0 && (progress.get(slug) ?? 0) === totalChecks;

    const modules = moduleGroups.map(({ module, lessons }) => ({
      title: module.title,
      completed: lessons.filter((l) =>
        isLessonComplete(l.meta.slug, l.meta.checks.length),
      ).length,
      total: lessons.length,
    }));

    const completedLessons = modules.reduce((sum, m) => sum + m.completed, 0);
    const totalLessons = allLessons.length;

    return {
      name: owner.name,
      image: owner.image,
      completedLessons,
      totalLessons,
      isCourseComplete: totalLessons > 0 && completedLessons === totalLessons,
      modules,
    };
  },
);
