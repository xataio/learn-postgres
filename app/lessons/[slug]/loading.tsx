export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 animate-pulse">
        <div className="h-3 w-24 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-6 h-8 w-2/3 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-3 w-32 rounded bg-black/5 dark:bg-white/5" />
        <div className="mt-10 space-y-3">
          <div className="h-4 w-full rounded bg-black/5 dark:bg-white/5" />
          <div className="h-4 w-11/12 rounded bg-black/5 dark:bg-white/5" />
          <div className="h-4 w-10/12 rounded bg-black/5 dark:bg-white/5" />
        </div>
      </div>
      <aside>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span
              aria-hidden
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500"
            />
            Preparing your sandbox
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Forking a fresh Postgres branch and loading the seed — usually a
            few seconds.
          </p>
        </div>
      </aside>
    </div>
  );
}
