import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userBranch } from "@/db/schema";
import { getLesson } from "@/lib/lessons";
import { runCheck } from "@/lib/checks";
import { markCheckPassed } from "@/lib/lesson-progress";

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
  if (!branch || !branch.connectionString) {
    return NextResponse.json(
      {
        error:
          "No sandbox for this lesson — refresh the page to prepare one.",
      },
      { status: 409 },
    );
  }

  const result = await runCheck(branch.connectionString, check);
  if (result.pass) {
    await markCheckPassed(session.user.id, slug, checkId).catch((err) => {
      console.error(`[check-route] could not persist pass: ${err.message}`);
    });
  }
  return NextResponse.json(result);
}
