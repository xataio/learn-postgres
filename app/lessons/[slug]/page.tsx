import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { auth } from "@/lib/auth";
import { getAllLessons, getLesson, type Lesson } from "@/lib/lessons";
import {
  ensureBranchForLesson,
  type UserBranchRow,
} from "@/lib/branch-manager";
import { buildLessonComponents } from "@/components/lesson/mdx-components";
import { BranchPanel } from "@/components/lesson/BranchPanel";

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

  const branchResult = await getBranchOrErrorState(session.user.id, lesson);
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
        <BranchPanel {...branchResult} />
      </aside>
    </div>
  );
}

type BranchState =
  | { kind: "ready"; lessonSlug: string; row: UserBranchRow }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

async function getBranchOrErrorState(
  userId: string,
  lesson: Lesson,
): Promise<BranchState> {
  if (
    !process.env.XATA_API_KEY ||
    !process.env.XATA_ORG_ID ||
    !process.env.XATA_PROJECT_ID
  ) {
    return { kind: "unconfigured" };
  }
  try {
    const row = await ensureBranchForLesson(userId, lesson);
    return { kind: "ready", lessonSlug: lesson.meta.slug, row };
  } catch (err) {
    return { kind: "error", message: (err as Error).message };
  }
}
