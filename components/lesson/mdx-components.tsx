import type { ComponentProps, ReactNode } from "react";
import type { Lesson } from "@/lib/lessons";
import { CheckCard } from "./Check";
import { RunBlock } from "./RunBlock";

type BuildOpts = {
  lesson: Lesson;
  passedCheckIds: Set<string>;
  isSignedIn: boolean;
  callbackURL: string;
};

export function buildLessonComponents({ lesson, passedCheckIds, isSignedIn, callbackURL }: BuildOpts) {
  return {
    Check: ({ id, children }: { id: string; children?: ReactNode }) => {
      const check = lesson.meta.checks.find((c) => c.id === id);
      return (
        <CheckCard
          check={check}
          lessonSlug={lesson.meta.slug}
          initiallyPassed={passedCheckIds.has(id)}
          isSignedIn={isSignedIn}
          callbackURL={callbackURL}
        >
          {children}
        </CheckCard>
      );
    },
    Run: ({ children }: { children: ReactNode }) => (
      <RunBlock isSignedIn={isSignedIn} callbackURL={callbackURL}>{children}</RunBlock>
    ),
    pre: (props: ComponentProps<"pre">) => (
      <pre
        {...props}
        className="not-prose my-5 overflow-x-auto rounded-lg border border-black/10 bg-zinc-50/60 px-4 py-3 text-sm leading-6 dark:border-white/10 dark:bg-zinc-900/40"
      />
    ),
    code: (props: ComponentProps<"code">) => (
      <code
        {...props}
        className={`font-mono text-zinc-800 dark:text-zinc-200 ${props.className ?? ""}`}
      />
    ),
  };
}
