"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { enableBadgeShare, disableBadgeShare } from "./badge-share-actions";

const BUTTON_STYLE =
  "rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]";

const noopSubscribe = () => () => {};

// Hydration-safe window.location.origin: empty during SSR and the first
// client render, the real origin right after.
function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

export function ShareProgressCard({
  token,
  enabled,
}: {
  token: string | null;
  enabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const origin = useOrigin();
  const badgePath = token ? `/badge/${token}` : null;
  const badgeUrl = badgePath ? `${origin}${badgePath}` : "";

  const run = (action: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(badgeUrl);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context): select the text
      // so the user can copy manually.
      inputRef.current?.select();
      return;
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 rounded-md border border-black/10 px-4 py-3 dark:border-white/10">
      <h2 className="font-mono text-sm font-semibold tracking-tight">
        Share your progress
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Get a public link to a badge showing your progress. Anyone with the
        link can see your name, avatar, and which lessons you&apos;ve
        completed.
      </p>

      {enabled && token ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={badgeUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-black/10 bg-black/[.02] px-2 py-1.5 font-mono text-xs text-zinc-600 dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-300"
              aria-label="Public badge link"
            />
            <button type="button" onClick={onCopy} className={BUTTON_STYLE}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={badgePath!}
              className={BUTTON_STYLE}
              target="_blank"
              rel="noopener"
            >
              View badge
            </Link>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(disableBadgeShare)}
              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              Disable
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Disabling makes the link stop working. Re-enabling restores the
            same link.
          </p>
        </>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(enableBadgeShare)}
            className={BUTTON_STYLE}
          >
            {isPending ? "Enabling…" : "Enable sharing"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
