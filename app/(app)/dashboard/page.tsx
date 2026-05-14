import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/dashboard");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-mono text-2xl font-semibold tracking-tight">
        Welcome, {session.user.name}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Signed in as {session.user.email}.
      </p>

      <div className="mt-8 rounded-md border border-black/10 p-4 dark:border-white/10">
        <div className="text-sm font-medium">Lessons</div>
        <p className="mt-1 text-sm text-zinc-500">
          Short, hands-on Postgres exercises. Pick one to begin.
        </p>
        <Link
          href="/lessons"
          className="mt-3 inline-block text-sm font-medium underline underline-offset-2"
        >
          Browse the catalog →
        </Link>
      </div>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
