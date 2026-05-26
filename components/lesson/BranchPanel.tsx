import { SignInButton } from "@/app/sign-in-button";

type Props =
  | { kind: "unconfigured" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; callbackURL: string };

export function BranchPanel(props: Props) {
  if (props.kind === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-black/10 bg-zinc-50 p-6 text-center dark:border-white/10 dark:bg-zinc-900/40">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to start your Postgres sandbox and run queries.
        </p>
        <SignInButton callbackURL={props.callbackURL} />
      </div>
    );
  }

  if (props.kind === "unconfigured") {
    return (
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
        <div className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Sandbox unavailable
        </div>
        <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
          Xata isn&apos;t configured yet. Set <code>XATA_API_KEY</code>,{" "}
          <code>XATA_ORG_ID</code>, and <code>XATA_PROJECT_ID</code> to enable
          per-lesson Postgres branches.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rose-300/60 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-950/30">
      <div className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
        Couldn&apos;t prepare your sandbox
      </div>
      <p className="mt-2 break-words font-mono text-xs text-rose-900 dark:text-rose-200">
        {props.message}
      </p>
    </div>
  );
}
