import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { userBranch } from "@/db/schema";
import { auth } from "@/lib/auth";
import { runCheck } from "@/lib/checks";
import { db } from "@/lib/db";
import { getPassedCheckIds, markCheckPassed } from "@/lib/lesson-progress";
import { getLesson, type Lesson } from "@/lib/lessons";

type Ctx = { params: Promise<{ slug: string; checkId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug, checkId } = await ctx.params;

  const lesson = await getLesson(slug);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const check = lesson.meta.checks.find((c) => c.id === checkId);
  if (!check) {
    return NextResponse.json({ error: "Check not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(userBranch)
    .where(
      and(
        eq(userBranch.userId, session.user.id),
        eq(userBranch.lessonSlug, slug),
      ),
    )
    .limit(1);
  const branch = rows[0];
  if (!branch?.connectionString) {
    return NextResponse.json(
      {
        error: "No sandbox for this lesson — refresh the page to prepare one.",
      },
      { status: 409 },
    );
  }

  const result = await runCheck(branch.connectionString, check);
  if (!result.pass) {
    return NextResponse.json(result);
  }
  const lessonCompleted = await recordPass(session.user.id, lesson, checkId);
  return NextResponse.json({
    ...result,
    lessonCompleted,
    checksTotal: lesson.meta.checks.length,
  });
}

const recordPass = async (
  userId: string,
  lesson: Lesson,
  checkId: string,
): Promise<boolean> => {
  const before = await getPassedCheckIds(userId, lesson.meta.slug).catch(
    () => null,
  );
  const persisted = await markCheckPassed(userId, lesson.meta.slug, checkId)
    .then(() => true)
    .catch((err) => {
      console.error(`[check-route] could not persist pass: ${err.message}`);
      return false;
    });
  if (!before || !persisted || before.has(checkId)) return false;
  return lesson.meta.checks.every((c) => c.id === checkId || before.has(c.id));
};
