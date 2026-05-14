import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <>
      <h1 className="font-mono text-2xl font-semibold tracking-tight">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        New here?{" "}
        <Link href="/sign-up" className="underline underline-offset-2">
          Create an account
        </Link>
        .
      </p>

      <div className="mt-6">
        <SignInForm />
      </div>
    </>
  );
}
