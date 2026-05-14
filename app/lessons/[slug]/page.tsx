import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { auth } from "@/lib/auth";
import { getAllLessons, getLesson } from "@/lib/lessons";
import { buildLessonComponents } from "@/components/lesson/mdx-components";

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
  if (!session) redirect(`/sign-in?next=/lessons/${slug}`);

  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const components = buildLessonComponents(lesson, "interactive");

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">
          <Link href="/lessons" className="hover:underline">
            ← All lessons
          </Link>
        </div>

        <header className="mt-4">
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            {lesson.meta.title}
          </h1>
          <div className="mt-1 text-xs text-zinc-500">
            {lesson.meta.difficulty} · {lesson.meta.estimatedMinutes} min
          </div>
        </header>

        <article className="prose prose-zinc mt-8 max-w-none dark:prose-invert">
          <MDXRemote source={lesson.mdxSource} components={components} />
        </article>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your sandbox
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The interactive psql-like terminal lands in Phase 3. For now this is
            the read-only lesson body — your dedicated Postgres branch will
            appear here once the branch manager is wired up.
          </p>
        </div>
      </aside>
    </div>
  );
}
