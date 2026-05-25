"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrepareStream } from "./usePrepareStream";
import { SandboxPrepProgress } from "./SandboxPrepProgress";

/**
 * Rendered the first time a lesson is opened (no ready branch yet). Drives the
 * streaming /prepare endpoint so the user watches the branch get forked and
 * seeded, then refreshes the server tree to swap in the interactive panel.
 */
export function SandboxBootstrap({ lessonSlug }: { lessonSlug: string }) {
  const router = useRouter();
  const { phase, error, run } = usePrepareStream(lessonSlug);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run().then((res) => {
      if (res.ok) router.refresh();
    });
  }, [run, router]);

  const onRetry = () => {
    run().then((res) => {
      if (res.ok) router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-zinc-900/40">
        <span className="flex min-w-0 items-center gap-2 text-zinc-500">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              phase === "error"
                ? "bg-rose-500"
                : "animate-pulse bg-amber-500"
            }`}
          />
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            preparing sandbox…
          </span>
        </span>
      </div>
      <div className="relative h-[60dvh] min-h-[320px] lg:h-auto lg:flex-1 lg:min-h-0">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-black/10 bg-zinc-950/60 backdrop-blur-[2px] dark:border-white/10">
          {phase === "error" ? (
            <div className="mx-4 max-w-sm rounded-md border border-rose-500/30 bg-zinc-900 p-4 text-sm text-zinc-100 shadow-lg">
              <div className="text-xs font-medium uppercase tracking-wide text-rose-300">
                Couldn&apos;t prepare your sandbox
              </div>
              <p className="mt-2 break-words font-mono text-xs text-rose-200">
                {error}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/10"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 shadow-lg">
              <SandboxPrepProgress phase={phase ?? "branching"} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
