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
import { SandboxPanel } from "@/components/lesson/SandboxPanel";

type Params = { slug: string };

type BranchState =
  | { kind: "ready"; row: UserBranchRow }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

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

  const branch = await getBranchState(session.user.id, lesson);
  const components = buildLessonComponents(lesson, "interactive");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="text-xs text-zinc-500">
        <Link href="/lessons" className="hover:underline">
          ← All lessons
        </Link>
      </div>

      <header className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          {lesson.meta.title}
        </h1>
        <div className="text-xs text-zinc-500">
          {lesson.meta.difficulty} · {lesson.meta.estimatedMinutes} min
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="prose prose-zinc max-w-none dark:prose-invert">
          <MDXRemote source={lesson.mdxSource} components={components} />
        </article>

        <div
          className={`flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start ${
            branch.kind === "ready" ? "lg:h-[calc(100dvh-3rem)]" : ""
          }`}
        >
          {branch.kind !== "ready" ? (
            <BranchPanel
              {...(branch.kind === "unconfigured"
                ? { kind: "unconfigured" as const }
                : { kind: "error" as const, message: branch.message })}
            />
          ) : (
            <SandboxPanel
              lessonSlug={lesson.meta.slug}
              branchName={branch.row.xataBranchName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function getBranchState(
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
    return { kind: "ready", row };
  } catch (err) {
    return { kind: "error", message: (err as Error).message };
  }
}
