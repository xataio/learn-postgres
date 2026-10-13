"use client";

import { useEffect } from "react";
import {
  capture,
  consumeGithubSignInIntent,
  identifyUser,
} from "@/lib/analytics";
import { useSession } from "@/lib/auth-client";

export const AnalyticsIdentity = () => {
  const { data } = useSession();
  const userId = data?.user.id;

  useEffect(() => {
    if (!userId) return;
    identifyUser(userId);
    const callbackURL = consumeGithubSignInIntent();
    if (callbackURL !== null) {
      capture("github_signin", {
        provider: "github",
        callback_url: callbackURL,
      });
    }
  }, [userId]);

  return null;
};
