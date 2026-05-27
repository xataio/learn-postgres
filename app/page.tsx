import Link from "next/link";
import { SignInButton } from "./sign-in-button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <main className="w-full max-w-2xl py-24">
        <h1 className="font-mono text-4xl font-semibold tracking-tight">
          Learn Postgres
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Short, hands-on lessons in real, disposable Postgres instances. Play
          with SQL in a psql-like terminal — no setup, no docker, no resets.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <SignInButton />
          <Link
            href="/dashboard"
            className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
          >
            Browse lessons
          </Link>
        </div>

        <p className="mt-12 text-sm text-zinc-500">
          Open source. Lessons live in <code className="font-mono">/lessons</code>{" "}
          — contributions welcome.
        </p>
      </main>
    </div>
  );
}
