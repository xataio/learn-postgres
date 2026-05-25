import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getLesson } from "@/lib/lessons";
import {
  ensureBranchForLesson,
  resetBranchForLesson,
} from "@/lib/branch-manager";
import { RateLimitError } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Prepare (or reset) the sandbox branch for a lesson, streaming progress as
 * newline-delimited JSON so the client can show the distinct branching and
 * seeding stages live. Each line is one event:
 *   { "phase": "branching" }
 *   { "phase": "seeding" }
 *   { "phase": "ready", "branch": { "name": "…" } }
 *   { "phase": "error", "message": "…", "retryAfterSeconds"?: number }
 */
export async function POST(req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const lesson = await getLesson(slug);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (
    !process.env.XATA_API_KEY ||
    !process.env.XATA_ORG_ID ||
    !process.env.XATA_PROJECT_ID
  ) {
    return NextResponse.json(
      { error: "Sandbox is not configured." },
      { status: 503 },
    );
  }

  let body: { reset?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — treat as a non-reset prepare.
  }
  const reset = body?.reset === true;
  const userId = session.user.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const onPhase = (phase: "branching" | "seeding") =>
          send({ phase });
        const row = reset
          ? await resetBranchForLesson(userId, lesson, onPhase)
          : await ensureBranchForLesson(userId, lesson, onPhase);

        // The lesson page reads the branch row in a server component, so the
        // RSC payload needs invalidating before the client's router.refresh()
        // will pick up the new branch. Guard it: a failure here shouldn't turn
        // an already-successful prepare into an error event.
        try {
          revalidatePath(`/lessons/${slug}`);
        } catch {
          // best-effort
        }
        send({ phase: "ready", branch: { name: row.xataBranchName } });
      } catch (err) {
        if (err instanceof RateLimitError) {
          send({
            phase: "error",
            message: err.message,
            retryAfterSeconds: err.retryAfterSeconds,
          });
        } else {
          send({ phase: "error", message: (err as Error).message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
