import { createAuthClient } from "better-auth/react";

// In the browser, always target the origin the app is served from. On Vercel
// preview deployments that is the preview URL, which is what makes the
// oAuthProxy flow run on the preview server instead of signing in against
// production. The env fallback only applies during SSR/build.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({ baseURL });

export const { signIn, signOut, useSession } = authClient;
