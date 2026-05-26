import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { auth } from "@/lib/auth";
import { getAllLessons, getLesson } from "@/lib/lessons";
import { buildLessonComponents } from "@/components/lesson/mdx-components";
import { SandboxSection } from "@/components/lesson/SandboxSection";
import { SandboxLoading } from "@/components/lesson/SandboxLoading";
import { getPassedCheckIds } from "@/lib/lesson-progress";

type Params = { slug: string };

export async function generateStaticParams() {
  const lessons = await getAllLessons();
  return lessons.map((l) => ({ slug: l.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) return {};
  return { title: `${lesson.meta.title} — Learn Postgres` };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const passedCheckIds = await getPassedCheckIds(session.user.id, slug);
  const components = buildLessonComponents({ lesson, passedCheckIds });
  const totalChecks = lesson.meta.checks.length;
  const passedCount = passedCheckIds.size;

  const allLessons = await getAllLessons();
  const idx = allLessons.findIndex((l) => l.meta.slug === slug);
  const prev = idx > 0 ? allLessons[idx - 1] : null;
  const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

  return (
    <div className="px-6 py-6">
      <div className="text-xs text-zinc-500">
        <Link href="/lessons" className="hover:underline">
          ← All lessons
        </Link>
      </div>

      <header className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-400">
            Module {lesson.meta.module.order} · {lesson.meta.module.title}
          </p>
          <h1 className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">
            {lesson.meta.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            {lesson.meta.difficulty} · {lesson.meta.estimatedMinutes} min
          </span>
          {totalChecks > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                passedCount === totalChecks
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {passedCount}/{totalChecks} checks
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <article className="prose prose-zinc dark:prose-invert">
          <MDXRemote source={lesson.mdxSource} components={components} />

          {(prev || next) && (
            <nav
              aria-label="Lesson navigation"
              className="not-prose mt-10 flex items-stretch justify-between gap-3 border-t border-black/10 pt-6 dark:border-white/10"
            >
              {prev ? (
                <Link
                  href={`/lessons/${prev.meta.slug}`}
                  className="group flex flex-1 flex-col items-start gap-0.5 rounded-md border border-black/10 px-3 py-2 text-left text-sm hover:border-black/20 hover:bg-black/[.03] dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.04]"
                >
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    ← Previous
                  </span>
                  <span className="font-medium">{prev.meta.title}</span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
              {next ? (
                <Link
                  href={`/lessons/${next.meta.slug}`}
                  className="group flex flex-1 flex-col items-end gap-0.5 rounded-md border border-black/10 px-3 py-2 text-right text-sm hover:border-black/20 hover:bg-black/[.03] dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.04]"
                >
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Next →
                  </span>
                  <span className="font-medium">{next.meta.title}</span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </nav>
          )}
        </article>

        <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start lg:h-[calc(100dvh-3rem)]">
          <Suspense fallback={<SandboxLoading />}>
            <SandboxSection userId={session.user.id} lesson={lesson} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
