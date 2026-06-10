"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { badgeShare } from "@/db/schema";
import { newShareToken } from "@/lib/badge-share";
import { enforceRate } from "@/lib/rate-limit";

async function requireUserId(): Promise<string> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function enableBadgeShare(): Promise<{ token: string }> {
  const userId = await requireUserId();
  enforceRate(`badge-share:${userId}`, 10, 60_000);

  // If the user already has a row we only flip `enabled` back on — the token
  // is never rotated, so disable/re-enable keeps the same share link. The
  // retry loop only matters for the (theoretical) token collision on first
  // insert.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newShareToken();
    try {
      const rows = await db
        .insert(badgeShare)
        .values({ userId, token })
        .onConflictDoUpdate({
          target: badgeShare.userId,
          set: { enabled: true, updatedAt: new Date() },
        })
        .returning({ token: badgeShare.token });
      revalidatePath("/lessons");
      return { token: rows[0].token };
    } catch {
      // unique violation on token — try again with a fresh one
    }
  }
  throw new Error("Could not generate a share link, please try again.");
}

export async function disableBadgeShare(): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(badgeShare)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(badgeShare.userId, userId));
  revalidatePath("/lessons");
}
