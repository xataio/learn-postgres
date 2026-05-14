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

      <div className="mt-8 rounded-md border border-black/10 p-4 text-sm text-zinc-500 dark:border-white/10">
        Lessons will appear here once Phase 1 lands.
      </div>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
