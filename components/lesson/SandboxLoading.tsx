export function SandboxLoading() {
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-zinc-900/40">
        <span className="flex min-w-0 items-center gap-2 text-zinc-500">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"
          />
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            preparing sandbox…
          </span>
        </span>
      </div>
      <div className="relative h-[60dvh] min-h-[320px] lg:h-auto lg:flex-1 lg:min-h-0">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-black/10 bg-zinc-950/60 backdrop-blur-[2px] dark:border-white/10">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-lg">
            <Spinner />
            <span>Forking a fresh Postgres branch…</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
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
