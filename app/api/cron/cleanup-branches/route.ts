import { NextResponse } from "next/server";
import { cleanupIdleBranches } from "@/lib/branch-manager";

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#how-to-secure-cron-jobs
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idleDays = Number(process.env.BRANCH_IDLE_DAYS ?? "7");
  try {
    const result = await cleanupIdleBranches(idleDays);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
