import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // Users who keep their email private on GitHub get no email back from
      // /user or /user/emails — fall back to GitHub's own noreply alias so
      // sign-in succeeds instead of redirecting to ?error=email_not_found.
      mapProfileToUser: (profile) => {
        if (profile.email) return {};
        return {
          email: `${profile.id}+${profile.login}@users.noreply.github.com`,
          emailVerified: false,
        };
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;
