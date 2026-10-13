import posthog from "posthog-js";

export type AnalyticsEvent =
  | "lesson_viewed"
  | "sandbox_opened"
  | "query_executed"
  | "check_passed"
  | "lesson_completed"
  | "github_signin"
  | "xata_cta_clicked";

type Properties = Record<string, string | number | boolean | null>;

const SIGNIN_INTENT_KEY = "learn:github-signin-intent";

export const capture = (event: AnalyticsEvent, properties?: Properties) => {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
};

export const identifyUser = (userId: string) => {
  if (!posthog.__loaded) return;
  posthog.identify(userId);
};

export const resetAnalytics = () => {
  if (!posthog.__loaded) return;
  posthog.reset();
};

export const markGithubSignInIntent = (callbackURL: string) => {
  try {
    sessionStorage.setItem(SIGNIN_INTENT_KEY, callbackURL);
  } catch {}
};

export const consumeGithubSignInIntent = (): string | null => {
  try {
    const callbackURL = sessionStorage.getItem(SIGNIN_INTENT_KEY);
    sessionStorage.removeItem(SIGNIN_INTENT_KEY);
    return callbackURL;
  } catch {
    return null;
  }
};
