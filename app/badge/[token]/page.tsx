import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBadgeByToken } from "@/lib/badge-share";
import { BadgeCard3D } from "@/components/badge/BadgeCard3D";

// Without this the route could be rendered once and cached, serving a badge
// after its owner disabled sharing. Force a per-request DB lookup.
export const dynamic = "force-dynamic";

type Params = { token: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { token } = await params;
  const badge = await getBadgeByToken(token);
  // Unguessable URLs are the access control here — keep them out of indexes.
  const robots = { index: false, follow: false };
  if (!badge) return { title: "Badge not found — Learn Postgres", robots };
  return {
    title: badge.isCourseComplete
      ? `${badge.name} completed Learn Postgres`
      : `${badge.name} — ${badge.completedLessons}/${badge.totalLessons} lessons on Learn Postgres`,
    description:
      "Short, hands-on Postgres exercises that run in real disposable databases.",
    robots,
  };
}

export default async function BadgePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const badge = await getBadgeByToken(token);
  if (!badge) notFound();

  const percent =
    badge.totalLessons > 0
      ? Math.round((badge.completedLessons / badge.totalLessons) * 100)
      : 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <BadgeCard3D>
        <div className="w-full max-w-sm p-6 sm:w-96">
          <div className="flex items-center gap-4">
            {badge.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={badge.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border border-black/10 dark:border-white/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 font-mono text-xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {badge.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate font-mono text-lg font-semibold tracking-tight">
                {badge.name}
              </h1>
              <p
                className={`text-sm ${
                  badge.isCourseComplete
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-500"
                }`}
              >
                {badge.isCourseComplete ? (
                  <>
                    <span aria-hidden>✓ </span>Completed the course
                  </>
                ) : (
                  `${badge.completedLessons} of ${badge.totalLessons} lessons completed`
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-right font-mono text-xs text-zinc-400">
              {percent}%
            </p>
          </div>

          <ul className="mt-4 space-y-2">
            {badge.modules.map((m) => {
              const done = m.total > 0 && m.completed === m.total;
              return (
                <li
                  key={m.title}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {m.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      done
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : m.completed > 0
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {done && (
                      <span aria-hidden className="mr-1">
                        ✓
                      </span>
                    )}
                    {m.completed}/{m.total}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 border-t border-black/5 pt-3 text-center font-mono text-xs text-zinc-400 dark:border-white/5">
            learn-postgres
          </p>
        </div>
      </BadgeCard3D>

      <Link
        href="/"
        className="mt-6 text-sm text-zinc-500 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
      >
        Start learning Postgres →
      </Link>
    </div>
  );
}
