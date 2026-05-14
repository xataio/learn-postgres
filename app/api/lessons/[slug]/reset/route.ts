import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLesson } from "@/lib/lessons";
import { resetBranchForLesson } from "@/lib/branch-manager";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const lesson = await getLesson(slug);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  try {
    const row = await resetBranchForLesson(session.user.id, lesson);
    return NextResponse.json({
      ok: true,
      branch: { id: row.xataBranchId, name: row.xataBranchName },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
