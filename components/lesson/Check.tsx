"use client";

import { useState, type ReactNode } from "react";
import type { Check } from "@/lib/lesson-schema";

type Status = "idle" | "running" | "pass" | "fail";

type Props = {
  check: Check | undefined;
  lessonSlug: string;
  initiallyPassed: boolean;
  children?: ReactNode;
};

export function CheckCard({
  check,
  lessonSlug,
  initiallyPassed,
  children,
}: Props) {
  const [status, setStatus] = useState<Status>(
    initiallyPassed ? "pass" : "idle",
  );
  const [failReason, setFailReason] = useState<string | null>(null);

  const canRun = !!check && status !== "running";

  const onRun = async () => {
    if (!check) return;
    setStatus("running");
    setFailReason(null);
    try {
      const res = await fetch(
        `/api/lessons/${encodeURIComponent(lessonSlug)}/checks/${encodeURIComponent(check.id)}`,
        { method: "POST" },
      );
      const json = (await res.json()) as
        | { pass: true }
        | { pass: false; reason: string }
        | { error: string };
      if ("error" in json) {
        setStatus("fail");
        setFailReason(json.error);
        return;
      }
      if (json.pass) {
        setStatus("pass");
        return;
      }
      setStatus("fail");
      setFailReason(json.reason ?? "Check failed.");
    } catch (err) {
      setStatus("fail");
      setFailReason((err as Error).message);
    }
  };

  const styles = stylesFor(status);

  return (
    <aside
      data-check-id={check?.id}
      className={`not-prose my-6 rounded-lg border p-4 ${styles.frame}`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${styles.heading}`}
      >
        {status === "running" ? <Spinner /> : <span aria-hidden>{styles.icon}</span>}
        <span>{styles.label}</span>
        {check && (
          <code className="ml-1 font-mono text-[10px] opacity-70">
            {check.id}
          </code>
        )}
      </div>

      <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
        {children ?? check?.description ?? "Complete this step."}
      </div>

      {failReason && (
        <p className="mt-2 break-words font-mono text-xs text-rose-700 dark:text-rose-300">
          {failReason}
        </p>
      )}

      {check && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onRun}
            disabled={!canRun}
            className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 text-xs font-medium hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/[.04]"
          >
            {status === "running"
              ? "Checking…"
              : status === "pass"
                ? "Re-check"
                : "Check"}
          </button>
        </div>
      )}
    </aside>
  );
}

type StatusStyle = {
  frame: string;
  heading: string;
  icon: string;
  label: string;
};

function stylesFor(status: Status): StatusStyle {
  switch (status) {
    case "pass":
      return {
        frame:
          "border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/30",
        heading: "text-emerald-700 dark:text-emerald-300",
        icon: "✓",
        label: "Passed",
      };
    case "fail":
      return {
        frame:
          "border-rose-300/60 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/30",
        heading: "text-rose-700 dark:text-rose-300",
        icon: "✗",
        label: "Failed",
      };
    case "running":
      return {
        frame:
          "border-sky-300/60 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/30",
        heading: "text-sky-700 dark:text-sky-300",
        icon: "•",
        label: "Checking",
      };
    case "idle":
    default:
      return {
        frame:
          "border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30",
        heading: "text-amber-700 dark:text-amber-300",
        icon: "◆",
        label: "Check",
      };
  }
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
