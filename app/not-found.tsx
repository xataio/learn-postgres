import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Learn Postgres",
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <p className="font-mono text-6xl font-semibold tracking-tight text-zinc-300 dark:text-zinc-700">
        404
      </p>
      <h1 className="mt-4 font-mono text-xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        This page doesn&apos;t exist, or the link you followed is no longer
        active.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/lessons"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
        >
          Browse lessons
        </Link>
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
        >
          Go home →
        </Link>
      </div>
    </div>
  );
}
