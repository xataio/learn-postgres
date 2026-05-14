"use client";

import { useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  interactive?: boolean;
};

export function RunBlock({ children, interactive = false }: Props) {
  const preRef = useRef<HTMLPreElement>(null);

  const onRun = () => {
    const sql = preRef.current?.textContent?.trim();
    if (!sql) return;
    window.dispatchEvent(
      new CustomEvent("learn:run", { detail: { sql } }),
    );
  };

  return (
    <div className="not-prose my-5 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
      <div className="flex items-center justify-between border-b border-black/5 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-white/5 dark:bg-zinc-900/60">
        <span className="font-mono">sql</span>
        <button
          type="button"
          onClick={onRun}
          disabled={!interactive}
          className="rounded border border-black/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]"
          title={
            interactive ? "Run in your shell" : "Available in the interactive lesson"
          }
        >
          ▶ Run
        </button>
      </div>
      <pre
        ref={preRef}
        className="overflow-x-auto bg-zinc-50/60 px-4 py-3 text-sm leading-6 dark:bg-zinc-900/40"
      >
        <code className="font-mono text-zinc-800 dark:text-zinc-200">
          {children}
        </code>
      </pre>
    </div>
  );
}
