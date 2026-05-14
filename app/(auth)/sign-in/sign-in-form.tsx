"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"email" | "github" | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("email");
    const res = await signIn.email({ email, password });
    setLoading(null);
    if (res.error) {
      setError(res.error.message ?? "Could not sign in");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const onGithub = async () => {
    setError(null);
    setLoading("github");
    await signIn.social({ provider: "github", callbackURL: "/dashboard" });
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onGithub}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]"
      >
        {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
      </button>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading !== null}
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading === "email" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
