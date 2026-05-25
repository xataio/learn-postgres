"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Terminal } from "@/components/shell/Terminal";
import { usePrepareStream } from "./usePrepareStream";
import { SandboxPrepProgress } from "./SandboxPrepProgress";

type Props = {
  lessonSlug: string;
  branchName: string;
};

export function SandboxPanel({ lessonSlug, branchName }: Props) {
  const router = useRouter();
  const { phase, error, run, clear } = usePrepareStream(lessonSlug);
  const [isPending, startTransition] = useTransition();

  // While the stream runs, `phase` is set (branching/seeding/ready). Once it's
  // ready we clear it and hand off to isPending, which stays true until the
  // refreshed RSC payload — with the new branch — has rendered.
  const streaming = phase !== null && phase !== "error";
  const busy = streaming || isPending;

  const onClearShell = () => {
    window.dispatchEvent(new CustomEvent("learn:clear-shell"));
  };

  const onReset = async () => {
    const res = await run({ reset: true });
    if (res.ok) {
      clear();
      startTransition(() => router.refresh());
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-zinc-900/40">
        <span className="flex min-w-0 items-center gap-2 text-zinc-500">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              busy ? "animate-pulse bg-amber-500" : "bg-emerald-500"
            }`}
          />
          <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">
            {branchName}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onClearShell}
            disabled={busy}
            title="Clear shell output and command history"
            className="rounded-md border border-black/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/[.04]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            aria-busy={busy}
            title="Drop and recreate the Postgres sandbox"
            className="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/[.04]"
          >
            {busy && <Spinner />}
            {busy ? "Resetting…" : "Reset"}
          </button>
        </div>
      </div>

      <div className="relative h-[60dvh] min-h-[320px] lg:h-auto lg:flex-1 lg:min-h-0">
        <Terminal key={branchName} lessonSlug={lessonSlug} />
        {busy && (
          <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-950/60 backdrop-blur-[2px]">
            <div className="rounded-md border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-lg">
              {streaming ? (
                <SandboxPrepProgress phase={phase ?? "branching"} />
              ) : (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Resetting sandbox…
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded border border-rose-300/60 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin text-current"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
