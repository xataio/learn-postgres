"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Variant = "compact" | "block";

export function ResetButton({
  lessonSlug,
  variant = "compact",
}: {
  lessonSlug: string;
  variant?: Variant;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onReset = async () => {
    if (
      !window.confirm(
        "Drop your sandbox for this lesson and start over? Any changes you've made will be lost.",
      )
    )
      return;
    setError(null);

    const res = await fetch(
      `/api/lessons/${encodeURIComponent(lessonSlug)}/reset`,
      { method: "POST" },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Reset failed (${res.status})`);
      return;
    }
    startTransition(() => router.refresh());
  };

  const baseCls =
    "rounded-md border border-black/10 font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]";
  const sizeCls =
    variant === "compact"
      ? "px-2 py-0.5 text-[11px]"
      : "w-full px-3 py-1.5 text-xs";

  return (
    <div className={variant === "compact" ? "shrink-0" : undefined}>
      <button
        type="button"
        onClick={onReset}
        disabled={pending}
        className={`${baseCls} ${sizeCls}`}
      >
        {pending ? "Resetting…" : "Reset"}
      </button>
      {error && (
        <p className="mt-1 break-words text-[11px] text-rose-600">{error}</p>
      )}
    </div>
  );
}
