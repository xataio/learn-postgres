"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResetButton({ lessonSlug }: { lessonSlug: string }) {
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

  return (
    <div>
      <button
        type="button"
        onClick={onReset}
        disabled={pending}
        className="w-full rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]"
      >
        {pending ? "Resetting…" : "Reset sandbox"}
      </button>
      {error && (
        <p className="mt-2 break-words text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
