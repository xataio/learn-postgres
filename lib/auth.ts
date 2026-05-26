import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  // Lets every Vercel preview deployment reuse the single GitHub OAuth app
  // registered against production. The OAuth round-trip goes through the
  // production callback, then the encrypted result is proxied back to the
  // preview origin. Requires BETTER_AUTH_URL to point at the production URL in
  // all environments (including previews), and the preview origin to be
  // trusted (see trustedOrigins below).
  plugins: [oAuthProxy({ productionURL: process.env.BETTER_AUTH_URL })],
  trustedOrigins: ["https://learn-postgres-*.vercel.app"],
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
