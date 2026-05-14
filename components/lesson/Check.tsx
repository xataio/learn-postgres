import type { ReactNode } from "react";
import type { Check } from "@/lib/lesson-schema";

type Props = {
  check?: Check;
  interactive?: boolean;
  children?: ReactNode;
};

export function CheckCard({ check, interactive = false, children }: Props) {
  return (
    <aside
      data-check-id={check?.id}
      className="not-prose my-6 rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
        <span aria-hidden>◆</span>
        <span>Check</span>
        {check && (
          <code className="ml-1 font-mono text-[10px] opacity-70">
            {check.id}
          </code>
        )}
      </div>
      <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
        {children ?? check?.description ?? "Complete this step."}
      </div>
      <div className="mt-3 text-xs text-zinc-500">
        {interactive
          ? "Auto-checking will land with Phase 4."
          : "Sign in to interact with this check."}
      </div>
    </aside>
  );
}
