import type { UserBranchRow } from "@/lib/branch-manager";
import { ResetButton } from "./ResetButton";

type Props =
  | { kind: "ready"; lessonSlug: string; row: UserBranchRow }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

function formatHost(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return url.host;
  } catch {
    return "—";
  }
}

export function BranchPanel(props: Props) {
  if (props.kind === "unconfigured") {
    return (
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
        <div className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Sandbox unavailable
        </div>
        <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
          Xata isn&apos;t configured yet. Set <code>XATA_API_KEY</code>,{" "}
          <code>XATA_ORG_ID</code>, and <code>XATA_PROJECT_ID</code> to enable
          per-lesson Postgres branches.
        </p>
      </div>
    );
  }

  if (props.kind === "error") {
    return (
      <div className="rounded-lg border border-rose-300/60 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-950/30">
        <div className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
          Couldn&apos;t prepare your sandbox
        </div>
        <p className="mt-2 break-words font-mono text-xs text-rose-900 dark:text-rose-200">
          {props.message}
        </p>
      </div>
    );
  }

  const { row, lessonSlug } = props;
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-emerald-500"
        />
        Sandbox ready
      </div>

      <dl className="mt-3 space-y-1.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-400">branch</dt>
          <dd className="min-w-0 truncate">{row.xataBranchName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-400">host</dt>
          <dd className="min-w-0 truncate">{formatHost(row.connectionString)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-400">created</dt>
          <dd>{row.createdAt.toISOString().slice(0, 10)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-zinc-500">
        The interactive psql-like terminal lands in Phase 3. Your branch is
        ready and waiting.
      </p>

      <div className="mt-4">
        <ResetButton lessonSlug={lessonSlug} />
      </div>
    </div>
  );
}
