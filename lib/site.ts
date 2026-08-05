// Canonical production origin. Hardcoded on purpose: metadata URLs must not
// depend on which Vercel alias served the request or on env configuration,
// otherwise share cards and canonicals point at learn-postgres.vercel.app.
export const SITE_URL = "https://learn.database.tech";
