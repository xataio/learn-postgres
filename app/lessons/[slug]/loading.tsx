export default function Loading() {
  return (
    <div className="px-6 py-6">
      <div className="h-3 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
      <div className="mt-3 h-8 w-2/3 max-w-md animate-pulse rounded bg-black/5 dark:bg-white/5" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-black/5 dark:bg-white/5" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-black/5 dark:bg-white/5" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
        <div className="h-[60dvh] min-h-[320px] animate-pulse rounded-lg bg-black/5 dark:bg-white/5 lg:h-[calc(100dvh-3rem)]" />
      </div>
    </div>
  );
}
