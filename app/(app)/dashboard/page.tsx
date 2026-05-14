import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllLessons, type Lesson } from "@/lib/lessons";
import { getProgressCounts } from "@/lib/lesson-progress";
import { SignOutButton } from "./sign-out-button";

type Bucket = "continue" | "completed" | "available";

type Enriched = {
  lesson: Lesson;
  passed: number;
  total: number;
  bucket: Bucket;
};

const SECTION_META: Record<
  Bucket,
  { title: string; helper: string; pillTone: string }
> = {
  continue: {
    title: "Continue learning",
    helper: "Lessons you've started but haven't finished checking.",
    pillTone:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  completed: {
    title: "Completed",
    helper: "All checks passed.",
    pillTone:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  available: {
    title: "Up next",
    helper: "Lessons you haven't started yet.",
    pillTone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

const SECTION_ORDER: Bucket[] = ["continue", "completed", "available"];

function classify(passed: number, total: number): Bucket {
  if (total > 0 && passed === total) return "completed";
  if (passed > 0 && passed < total) return "continue";
  return "available";
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const lessons = await getAllLessons();
  const progress = await getProgressCounts(
    session.user.id,
    lessons.map((l) => l.meta.slug),
  );

  const enriched: Enriched[] = lessons.map((lesson) => {
    const total = lesson.meta.checks.length;
    const passed = progress.get(lesson.meta.slug) ?? 0;
    return { lesson, passed, total, bucket: classify(passed, total) };
  });

  const completedCount = enriched.filter((e) => e.bucket === "completed").length;
  const startedCount = enriched.filter((e) => e.bucket === "continue").length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Signed in as {session.user.email}.
        </p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {completedCount > 0 ? (
            <>
              You&apos;ve completed{" "}
              <strong className="font-semibold">{completedCount}</strong>{" "}
              {completedCount === 1 ? "lesson" : "lessons"}
              {startedCount > 0 ? (
                <>
                  {" "}and have{" "}
                  <strong className="font-semibold">{startedCount}</strong> in
                  progress.
                </>
              ) : (
                "."
              )}
            </>
          ) : startedCount > 0 ? (
            <>
              You have <strong className="font-semibold">{startedCount}</strong>{" "}
              {startedCount === 1 ? "lesson" : "lessons"} in progress.
            </>
          ) : (
            <>Pick a lesson below to begin.</>
          )}
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {SECTION_ORDER.map((bucket) => {
          const rows = enriched.filter((e) => e.bucket === bucket);
          if (rows.length === 0) return null;
          const meta = SECTION_META[bucket];
          return (
            <section key={bucket}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-mono text-sm font-semibold tracking-wide uppercase text-zinc-700 dark:text-zinc-300">
                  {meta.title}
                </h2>
                <span className="text-xs text-zinc-500">{rows.length}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{meta.helper}</p>

              <ul className="mt-3 space-y-1.5">
                {rows.map(({ lesson, passed, total }) => (
                  <li key={lesson.meta.slug}>
                    <Link
                      href={`/lessons/${lesson.meta.slug}`}
                      className="group flex items-center gap-3 rounded-md border border-black/10 px-3 py-2 transition hover:border-black/20 hover:bg-black/[.02] dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.02]"
                    >
                      <span className="font-mono text-xs text-zinc-400">
                        {String(lesson.meta.order).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-zinc-800 group-hover:underline dark:text-zinc-200">
                        {lesson.meta.title}
                      </span>
                      {total > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pillTone}`}
                        >
                          {bucket === "completed" && (
                            <span aria-hidden className="mr-1">
                              ✓
                            </span>
                          )}
                          {passed}/{total}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-12 border-t border-black/5 pt-6 dark:border-white/5">
        <SignOutButton />
      </div>
    </div>
  );
}
