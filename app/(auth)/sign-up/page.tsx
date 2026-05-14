import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-mono text-2xl font-semibold tracking-tight">
        Create an account
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Already have one?{" "}
        <Link href="/sign-in" className="underline underline-offset-2">
          Sign in
        </Link>
        .
      </p>

      <div className="mt-6">
        <SignUpForm />
      </div>
    </>
  );
}
