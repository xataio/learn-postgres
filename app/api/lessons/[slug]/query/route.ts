import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userBranch } from "@/db/schema";
import { runQuery } from "@/lib/shell/query-runner";
import { checkRate } from "@/lib/rate-limit";

const QUERY_RATE_LIMIT = Number(process.env.QUERY_RATE_LIMIT ?? 30);
const QUERY_RATE_WINDOW_MS = Number(process.env.QUERY_RATE_WINDOW_MS ?? 10_000);

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rate = checkRate(
    `query:${session.user.id}`,
    QUERY_RATE_LIMIT,
    QUERY_RATE_WINDOW_MS,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many queries. Slow down and retry in ${rate.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
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
  if (!branch) {
    return NextResponse.json(
      { error: "No sandbox for this lesson yet — open the lesson page first." },
      { status: 404 },
    );
  }
  if (!branch.connectionString) {
    console.error(
      `[query-route] empty connection_string for user=${session.user.id} lesson=${slug}\n` +
        `  row keys      = ${JSON.stringify(Object.keys(branch))}\n` +
        `  connStr typeof= ${typeof branch.connectionString}\n` +
        `  connStr len   = ${(branch.connectionString as unknown as string | null | undefined)?.length ?? "n/a"}\n` +
        `  xataBranchId  = ${JSON.stringify(branch.xataBranchId)}\n` +
        `  xataBranchName= ${JSON.stringify(branch.xataBranchName)}`,
    );
    return NextResponse.json(
      {
        error:
          "Your sandbox record is incomplete — refresh the page to repair it.",
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
