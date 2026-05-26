import { SignInButton } from "@/app/sign-in-button";

export function SandboxSignInPrompt({ callbackURL }: { callbackURL: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-zinc-900/40">
        <span className="flex min-w-0 items-center gap-2 text-zinc-500">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400"
          />
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            sandbox locked
          </span>
        </span>
      </div>
      <div className="relative h-[60dvh] min-h-[320px] lg:h-auto lg:flex-1 lg:min-h-0">
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-black/10 bg-[#09090b] dark:border-white/10">
          <div className="flex max-w-xs flex-col items-center gap-4 px-6 text-center">
            <p className="text-sm text-zinc-400">
              Sign in to spin up your own Postgres sandbox and run the queries
              for this lesson.
            </p>
            <SignInButton callbackURL={callbackURL}>
              Sign in to start the sandbox
            </SignInButton>
          </div>
        </div>
      </div>
    </>
  );
}
