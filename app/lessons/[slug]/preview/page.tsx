import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
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
  return { title: `${lesson.meta.title} (preview) — Learn Postgres` };
}

export default async function LessonPreviewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const components = buildLessonComponents(lesson, "preview");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
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
          Preview · {lesson.meta.difficulty} · {lesson.meta.estimatedMinutes} min
        </div>
      </header>

      <div className="mt-4 rounded-md border border-sky-200/60 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200">
        You&apos;re reading a read-only preview.{" "}
        <Link href="/sign-in" className="underline underline-offset-2">
          Sign in
        </Link>{" "}
        to run queries in your own Postgres sandbox.
      </div>

      <article className="prose prose-zinc mt-8 max-w-none dark:prose-invert">
        <MDXRemote source={lesson.mdxSource} components={components} />
      </article>
    </div>
  );
}
