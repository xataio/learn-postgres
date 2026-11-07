import Link from "next/link";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  searchParams: Promise<{ callbackURL?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { callbackURL } = await searchParams;
  const next = callbackURL?.startsWith("/") ? callbackURL : "/lessons";

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <div className="mb-10 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm font-medium hover:underline"
        >
          ← Learn Postgres
        </Link>
        <ThemeToggle />
      </div>
      <EmailAuthForm mode="sign-up" callbackURL={next} />
    </div>
  );
}
