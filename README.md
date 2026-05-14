# Learn Postgres

Short, hands-on Postgres lessons backed by real, disposable Postgres instances
(Xata branches), one per (user, lesson). Open source — lessons live in
`/lessons` and contributions are welcome.

See [`PLAN.md`](./PLAN.md) for the full design.

## Status

Phase 0 — skeleton with Next.js 16 App Router, Drizzle, and better-auth
(email/password + GitHub). Lessons, branch manager, and the web shell land in
later phases.

## Local setup

Requires Node 22.13+ (Next 16 minimum) and a Postgres database for app
metadata. We use Xata's "main" branch for this; any Postgres works for local
dev.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# edit .env.local — at minimum set DATABASE_URL and BETTER_AUTH_SECRET
# (openssl rand -base64 32). GitHub OAuth is optional in dev.

# 3. Push the schema to your DB (creates the better-auth + app tables)
npm run db:push

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>, create an account, and land on `/dashboard`.

### Useful scripts

| Script             | What it does                              |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Next.js dev server (Turbopack)            |
| `npm run build`    | Production build                          |
| `npm run lint`     | ESLint                                    |
| `npm run db:push`  | Push Drizzle schema to the database       |
| `npm run db:generate` | Generate a migration from schema diff  |
| `npm run db:migrate`  | Apply pending migrations               |
| `npm run db:studio`   | Open Drizzle Studio                    |

## Project layout

```
app/                       Next.js App Router
  (auth)/sign-in           email/password + GitHub
  (auth)/sign-up
  (app)/dashboard          protected
  api/auth/[...all]        better-auth handler
db/schema.ts               Drizzle schema (auth + app tables)
lib/auth.ts                better-auth server config
lib/auth-client.ts         better-auth client (React)
lib/db.ts                  Drizzle client
proxy.ts                   route protection (was middleware before Next 16)
PLAN.md                    design doc
```

## Contributing

Lesson authoring guide and contribution workflow land in Phase 1.
