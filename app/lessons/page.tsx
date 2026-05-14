import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAllLessons } from "@/lib/lessons";
import { getProgressCounts } from "@/lib/lesson-progress";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = { title: "Lessons — Learn Postgres" };

const difficultyBadge: Record<string, string> = {
  beginner:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  intermediate:
    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  advanced:
    "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export default async function LessonsCatalogPage() {
  const [lessons, session] = await Promise.all([
    getAllLessons(),
    auth.api.getSession({ headers: await headers() }).catch(() => null),
  ]);

  const progress = session
    ? await getProgressCounts(
        session.user.id,
        lessons.map((l) => l.meta.slug),
      )
    : new Map<string, number>();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            Lessons
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {session
              ? "Short, hands-on Postgres exercises. Pick one to run in your sandbox."
              : "Short, hands-on Postgres exercises. Sign in to run them in your own sandbox."}
          </p>
        </div>
        {session && (
          <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
            <span className="hidden truncate sm:inline">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="mt-10 rounded-md border border-dashed border-black/10 p-6 text-sm text-zinc-500 dark:border-white/10">
          No lessons yet. Add the first one under{" "}
          <code className="font-mono">/lessons</code>.
        </div>
      ) : (
        <ul className="mt-10 space-y-2">
          {lessons.map((lesson) => {
            const total = lesson.meta.checks.length;
            const passed = progress.get(lesson.meta.slug) ?? 0;
            const showProgress = !!session && total > 0;
            const complete = showProgress && passed === total;
            return (
              <li
                key={lesson.meta.slug}
                className="rounded-lg border border-black/10 p-4 transition hover:border-black/20 hover:bg-black/[.02] dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.02]"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-mono text-base font-semibold">
                      <Link
                        href={`/lessons/${lesson.meta.slug}`}
                        className="hover:underline"
                      >
                        <span className="text-zinc-400">
                          {String(lesson.meta.order).padStart(2, "0")}.
                        </span>{" "}
                        {lesson.meta.title}
                      </Link>
                    </h2>
                    {lesson.meta.summary && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {lesson.meta.summary}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      difficultyBadge[lesson.meta.difficulty] ?? ""
                    }`}
                  >
                    {lesson.meta.difficulty}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{lesson.meta.estimatedMinutes} min</span>
                  {lesson.meta.tags.length > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">
                        {lesson.meta.tags.join(" · ")}
                      </span>
                    </>
                  )}
                  {showProgress && (
                    <span
                      className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                        complete
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : passed > 0
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {complete && <span aria-hidden>✓</span>}
                      {passed}/{total} checks
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
