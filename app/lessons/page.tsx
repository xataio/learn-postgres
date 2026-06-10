import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getModules } from "@/lib/lessons";
import { getProgressCounts } from "@/lib/lesson-progress";
import { getShareForUser } from "@/lib/badge-share";
import { SignOutButton } from "./sign-out-button";
import { SignInButton } from "@/app/sign-in-button";
import { ShareProgressCard } from "./share-progress-card";

type Bucket = "continue" | "completed" | "available";

type Progress = { passed: number; total: number; bucket: Bucket };

const PILL_TONE: Record<Bucket, string> = {
  continue: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  available: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const DIFFICULTY_TONE: Record<string, string> = {
  beginner:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  intermediate:
    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  advanced: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function classify(passed: number, total: number): Bucket {
  if (total > 0 && passed === total) return "completed";
  if (passed > 0 && passed < total) return "continue";
  return "available";
}

export default async function DashboardPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  const modules = await getModules();
  const allLessons = modules.flatMap((m) => m.lessons);
  const progress = session
    ? await getProgressCounts(
        session.user.id,
        allLessons.map((l) => l.meta.slug),
      )
    : new Map<string, number>();

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

  const share = session ? await getShareForUser(session.user.id) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {session ? `Welcome, ${session.user.name}` : "Lessons"}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {session
                ? `Signed in as ${session.user.email}.`
                : "Short, hands-on Postgres exercises. Sign in to run them in your own sandbox and track your progress."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {session ? (
              <>
                <ShareProgressCard
                  token={share?.token ?? null}
                  enabled={share?.enabled ?? false}
                />
                <SignOutButton />
              </>
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
        {session && (
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
                You have{" "}
                <strong className="font-semibold">{startedCount}</strong>{" "}
                {startedCount === 1 ? "lesson" : "lessons"} in progress.
              </>
            ) : (
              <>Pick a lesson below to begin.</>
            )}
          </p>
        )}
      </header>

      <div className="mt-10 space-y-10">
        {modules.map(({ module, lessons }) => (
          <section key={module.slug}>
            <div className="flex items-baseline gap-2">
              <h2 className="font-mono text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                {module.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${DIFFICULTY_TONE[module.difficulty]}`}
              >
                {module.difficulty}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs text-zinc-400">
                Module {module.order}
              </span>
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
                      className="group flex items-start gap-3 rounded-md border border-black/10 px-3 py-2 transition hover:border-black/20 hover:bg-black/[.02] dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.02]"
                    >
                      <span className="mt-0.5 font-mono text-xs text-zinc-400">
                        {String(lesson.meta.order).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-sm font-medium text-zinc-800 group-hover:underline dark:text-zinc-200">
                          {lesson.meta.title}
                        </span>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                          <span>{lesson.meta.estimatedMinutes} min</span>
                          {lesson.meta.tags.length > 0 && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="truncate">
                                {lesson.meta.tags.join(" · ")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {session && total > 0 && (
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL_TONE[bucket]}`}
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
    </div>
  );
}
