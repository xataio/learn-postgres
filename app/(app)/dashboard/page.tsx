import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getModules } from "@/lib/lessons";
import { getProgressCounts } from "@/lib/lesson-progress";
import { SignOutButton } from "./sign-out-button";

type Bucket = "continue" | "completed" | "available";

type Progress = { passed: number; total: number; bucket: Bucket };

const PILL_TONE: Record<Bucket, string> = {
  continue: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  available: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function classify(passed: number, total: number): Bucket {
  if (total > 0 && passed === total) return "completed";
  if (passed > 0 && passed < total) return "continue";
  return "available";
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const modules = await getModules();
  const allLessons = modules.flatMap((m) => m.lessons);
  const progress = await getProgressCounts(
    session.user.id,
    allLessons.map((l) => l.meta.slug),
  );

  const stateBySlug = new Map<string, Progress>();
  for (const lesson of allLessons) {
    const total = lesson.meta.checks.length;
    const passed = progress.get(lesson.meta.slug) ?? 0;
    stateBySlug.set(lesson.meta.slug, {
      passed,
      total,
      bucket: classify(passed, total),
    });
  }

  const states = [...stateBySlug.values()];
  const completedCount = states.filter((s) => s.bucket === "completed").length;
  const startedCount = states.filter((s) => s.bucket === "continue").length;

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
        {modules.map(({ module, lessons }) => (
          <section key={module.slug}>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-zinc-400">
                Module {module.order}
              </span>
              <h2 className="font-mono text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                {module.title}
              </h2>
            </div>

            <ul className="mt-3 space-y-1.5">
              {lessons.map((lesson) => {
                const { passed, total, bucket } = stateBySlug.get(
                  lesson.meta.slug,
                )!;
                return (
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
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL_TONE[bucket]}`}
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
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-black/5 pt-6 dark:border-white/5">
        <SignOutButton />
      </div>
    </div>
  );
}
