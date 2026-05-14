import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userBranch } from "@/db/schema";
import { runQuery } from "@/lib/shell/query-runner";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await ctx.params;

  let body: { sql?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sql = typeof body.sql === "string" ? body.sql : "";
  if (!sql.trim()) {
    return NextResponse.json({ error: "Empty SQL" }, { status: 400 });
  }
  if (sql.length > 200_000) {
    return NextResponse.json(
      { error: "SQL payload too large" },
      { status: 413 },
    );
  }

  const branch = await db.query.userBranch.findFirst({
    where: and(
      eq(userBranch.userId, session.user.id),
      eq(userBranch.lessonSlug, slug),
    ),
  });
  if (!branch) {
    return NextResponse.json(
      { error: "No sandbox for this lesson yet — open the lesson page first." },
      { status: 404 },
    );
  }
  if (!branch.connectionString) {
    console.error(
      `[query-route] user=${session.user.id} lesson=${slug} branch=${branch.xataBranchId} has no connection_string`,
    );
    return NextResponse.json(
      {
        error:
          "Your sandbox record is incomplete — click Reset above to recreate it.",
      },
      { status: 409 },
    );
  }

  // touch last_used_at non-blocking
  db
    .update(userBranch)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(userBranch.userId, session.user.id),
        eq(userBranch.lessonSlug, slug),
      ),
    )
    .catch(() => {});

  const result = await runQuery(branch.connectionString, sql);
  return NextResponse.json(result);
}
