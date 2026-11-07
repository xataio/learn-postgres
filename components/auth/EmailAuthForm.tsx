"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

type Props = {
  mode: Mode;
  callbackURL?: string;
};

export function EmailAuthForm({ mode, callbackURL = "/lessons" }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "sign-up") {
        const result = await signUp.email({
          name: name.trim() || email.split("@")[0] || "Learner",
          email: email.trim(),
          password,
          callbackURL,
        });
        if (result.error) {
          setError(result.error.message ?? "Could not create account.");
          return;
        }
      } else {
        const result = await signIn.email({
          email: email.trim(),
          password,
          callbackURL,
        });
        if (result.error) {
          setError(result.error.message ?? "Could not sign in.");
          return;
        }
      }
      router.push(callbackURL);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onGitHub = async () => {
    setGithubLoading(true);
    setError(null);
    await signIn.social({ provider: "github", callbackURL });
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-mono text-2xl font-semibold tracking-tight">
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        {mode === "sign-in"
          ? "Use email or GitHub to unlock your Postgres sandbox."
          : "No GitHub required — email is enough to run lessons."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        {mode === "sign-up" && (
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </label>

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? "Working…"
            : mode === "sign-in"
              ? "Sign in with email"
              : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        or
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <button
        type="button"
        onClick={onGitHub}
        disabled={githubLoading}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.04]"
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="h-4 w-4 fill-current"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {githubLoading ? "Redirecting…" : "Continue with GitHub"}
      </button>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {mode === "sign-in" ? (
          <>
            New here?{" "}
            <Link
              href={`/sign-up?callbackURL=${encodeURIComponent(callbackURL)}`}
              className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`}
              className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
