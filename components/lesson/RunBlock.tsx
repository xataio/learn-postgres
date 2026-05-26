"use client";

import { useRef, useId, type ReactNode } from "react";
import { signIn } from "@/lib/auth-client";
import { storeScrollAnchor } from "./ScrollToAnchor";

type Props = {
  children: ReactNode;
  isSignedIn?: boolean;
  callbackURL?: string;
};

export function RunBlock({ children, isSignedIn = true, callbackURL = "/dashboard" }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  // useId() produces ids like ":r0:" — strip colons so the id is a clean URL-fragment-safe string.
  const id = useId().replace(/:/g, "");

  const onRun = () => {
    // Collapse the multi-line, prose-friendly formatting in the rendered block
    // down to a single line so the shell echoes it cleanly.
    const sql = preRef.current?.textContent?.replace(/\s+/g, " ").trim();
    if (!sql) return;
    window.dispatchEvent(new CustomEvent("learn:run", { detail: { sql } }));
  };

  const onSignIn = () => {
    storeScrollAnchor(id);
    signIn.social({ provider: "github", callbackURL });
  };

  return (
    <div id={id} className="not-prose my-5 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
      <div className="flex items-center justify-between border-b border-black/5 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-white/5 dark:bg-zinc-900/60">
        <span className="font-mono">sql</span>
        {isSignedIn ? (
          <button
            type="button"
            onClick={onRun}
            className="cursor-pointer rounded border border-black/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
            title="Run in your shell"
          >
            ▶ Run
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="cursor-pointer rounded border border-black/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
            title="Sign in to run this query"
          >
            Sign in to run
          </button>
        )}
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
