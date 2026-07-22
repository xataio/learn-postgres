# Learn Postgres

Learn Postgres by running Postgres. Short, hands-on lessons where every learner
gets a **real, disposable Postgres database** — provisioned in seconds, yours to
break, one click to reset — and a psql-like terminal right in the browser. No
installs, no Docker, no shared sandbox.

## Goals

- **Learning by doing.** Every concept is introduced through queries you
  actually run. The prose exists to set up the next query, not the other way
  around.
- **Real Postgres, not a simulation.** Each (user, lesson) pair gets its own
  Postgres branch. `EXPLAIN ANALYZE` shows real plans, locks really block,
  and mistakes have real consequences — safely.
- **Short, focused lessons.** One concept per lesson, honest time estimates,
  skimmable prose.
- **Open source content.** The whole course lives in [`/lessons`](./lessons)
  as MDX + YAML + SQL. Improving a lesson is a normal pull request — see
  [CONTRIBUTING.md](./CONTRIBUTING.md).

## The course

10 modules, 43 lessons, from your first `SELECT` to production operations:

1. **Query fundamentals** — SELECT, WHERE, sorting, aggregation
2. **Changing data** — INSERT, UPDATE, DELETE, upserts, transactions
3. **Combining tables** — joins, set operations, subqueries
4. **Schema and modeling** — data types, constraints, DDL, normalization
5. **Intermediate querying** — conditional expressions, CTEs, window functions
6. **Postgres power types** — arrays, JSONB, ranges, full-text search
7. **Performance and indexing** — indexes, EXPLAIN, query optimization, partitioning
8. **Programmability** — views, functions, triggers, procedures
9. **Concurrency** — MVCC, isolation, locking, deadlocks
10. **Expert and operations** — roles, vacuum, extensions, a troubleshooting capstone

Lessons are readable without an account; signing in (GitHub) unlocks the
interactive sandbox, checks, and progress tracking — including a shareable
progress badge.

## How it works

```
Browser
 ├─ Next.js pages (catalog, lessons, badge)
 └─ xterm.js shell — client-side readline, history, \d-style meta-commands
       │ one HTTP POST per statement
       ▼
Next.js server (stateless, Vercel-deployable)
 ├─ better-auth (GitHub OAuth)
 ├─ Lesson loader (MDX + YAML from /lessons, catalog built at build time)
 ├─ Branch manager (create / fork / reset / cleanup via Xata API)
 ├─ Query proxy (pg → the learner's branch, per request)
 └─ Check runner (lesson-defined assertions, progress persisted)
       ▼
Xata Postgres
 ├─ main branch     → app metadata (users, sessions, branch registry, progress)
 ├─ tpl-* branches  → pre-seeded template per lesson, built at deploy time
 └─ user branches   → one per (user, lesson), copy-on-write fork of a template
```

The pieces that make it feel instant and stay cheap:

- **Copy-on-write sandboxes.** At deploy time, `templates:prepare` builds a
  pre-seeded template branch per lesson. Opening a lesson forks the template,
  so even lessons with multi-million-row seeds (the indexing module) open in
  seconds. "Reset lesson" just drops and re-forks.
- **A stateless shell.** The terminal is fully client-side (line editing,
  history, psql-style output and meta-commands like `\d` and `\dt`); each
  completed statement is a single HTTP request to the query proxy. No
  WebSockets, no server-side sessions.
- **Optional auto-checking.** Lessons can declare checks (row counts, schema
  state, arbitrary queries) that run against *your* branch and persist to your
  progress.
- **Housekeeping.** Idle branches are dropped by a daily cron; per-user branch
  count is capped with LRU eviction; queries are rate-limited and time-boxed.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 ·
Drizzle · better-auth · next-mdx-remote · xterm.js · Xata · Vercel.

## Repo layout

```
lessons/            the course — one folder per module, one per lesson
                    (lesson.mdx + lesson.yaml + seed.sql)
app/                Next.js App Router: catalog, lesson pages, badge,
                    API routes (query proxy, checks, reset, cron cleanup)
components/         lesson UI (<Run>, <Check>, sandbox panel) and the shell
                    internals (readline, formatter, meta-commands)
lib/                auth, db, lesson discovery/schema, branch manager,
                    check runner, rate limiting, Xata API client
db/                 Drizzle schema + migrations for app metadata
scripts/            new-lesson scaffolder, lesson validator, template prep,
                    Vercel build entry, Xata cleanup
```

## Getting started (local dev)

You'll need:

- **Node 22.13+** and npm.
- **A Postgres database** for app metadata (sessions, progress). Any Postgres
  works locally; production uses the Xata project's `main` branch.
- **A GitHub OAuth app** — sign-in is GitHub-only, so this is required to test
  anything behind auth. Create one at
  <https://github.com/settings/developers> with callback URL
  `http://localhost:3000/api/auth/callback/github`.
- **A Xata project** (optional) — only needed for the interactive sandbox.
  Without it you can still browse the catalog and read every lesson.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in (see comments in the file for where each value comes from):
#   DATABASE_URL           app-metadata Postgres
#   BETTER_AUTH_SECRET     openssl rand -base64 32
#   GITHUB_CLIENT_ID/SECRET  required for sign-in
#   XATA_API_KEY / XATA_ORG_ID / XATA_PROJECT_ID   required for sandboxes

# 3. Create the app tables in your metadata database
npm run db:push

# 4. Run it
npm run dev
```

Open <http://localhost:3000>. Lessons render immediately; sign in with GitHub
to get a sandbox. You do **not** need to prepare template branches locally —
when a lesson has no template, the branch manager falls back to seeding the
sandbox on demand.

### Useful scripts

| Script                     | What it does                                      |
| -------------------------- | ------------------------------------------------- |
| `npm run dev`              | Next.js dev server                                |
| `npm run build`            | Production build (also compiles every lesson)     |
| `npm run lint`             | ESLint                                            |
| `npm run lessons:validate` | Validate lesson YAML, structure, and check IDs    |
| `npm run new-lesson`       | Scaffold a lesson (see CONTRIBUTING.md)           |
| `npm run templates:prepare`| Build pre-seeded template branches (deploy-time)  |
| `npm run db:push`          | Push the Drizzle schema to your metadata DB       |
| `npm run db:studio`        | Browse the metadata DB in Drizzle Studio          |

## Contributing

Lesson improvements and new lessons are the most valuable contributions —
[CONTRIBUTING.md](./CONTRIBUTING.md) walks through the lesson format, the MDX
escaping rules, seed constraints, and the PR conventions. App code
contributions are welcome too.

## License

[Apache 2.0](./LICENSE)

<br>
<p align="right">Made with :heart: by <a href="https://xata.io">Xata 🦋</a></p>
