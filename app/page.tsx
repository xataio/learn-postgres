import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="flex items-center justify-end gap-2 py-4">
        <ThemeToggle />
        <Link
          href="/sign-in?callbackURL=/lessons"
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
        >
          Sign in
        </Link>
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-16">
        <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase">
          database.tech
        </p>
        <h1 className="mt-2 font-mono text-4xl font-semibold tracking-tight">
          Learn Postgres
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Short, hands-on lessons in real, disposable Postgres instances. Play
          with SQL in a psql-like terminal — no setup, no Docker. Reset your
          sandbox anytime.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/lessons/select-basics"
            className="flex items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Start SELECT basics
          </Link>
          <Link
            href="/lessons"
            className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
          >
            Browse lessons
          </Link>
        </div>

        <p className="mt-12 text-sm text-zinc-500">
          Open source. Lessons live in{" "}
          <Link
            href="/lessons"
            className="font-mono underline-offset-2 hover:underline"
          >
            /lessons
          </Link>{" "}
          —{" "}
          <a
            href="https://github.com/xataio/learn-postgres"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            contributions welcome
          </a>
          .
        </p>
      </main>
    </div>
  );
}
