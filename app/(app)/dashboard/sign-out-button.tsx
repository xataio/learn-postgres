"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  const onClick = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
    >
      Sign out
    </button>
  );
}
