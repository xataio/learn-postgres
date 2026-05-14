"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        className ??
        "rounded-md border border-black/10 px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]"
      }
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
