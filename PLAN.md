# Learn-Postgres — Plan

## Vision
Short hands-on Postgres lessons backed by **real, disposable Postgres** (Xata branches), one per (user, lesson). Community-contributable lessons in the repo. Browser-based **psql-like terminal** as the primary interaction surface. Sign-in required.

## Architecture

```
Browser
 ├─ Next.js App Router pages (catalog, lesson, auth, dashboard)
 └─ xterm.js shell (client-side readline, history, meta-cmds)
       │ POST /api/.../query  (SSE later for long results)
       ▼
Next.js server
 ├─ better-auth (sessions, GitHub OAuth + email/password)
 ├─ Lesson loader (MDX + YAML from /lessons/*)
 ├─ Branch manager (Xata API: create / fork / drop)
 ├─ Query proxy (pg → user's Xata branch, per-request)
 └─ Check runner (lesson-defined assertions)
       │
       ▼
 Xata Postgres
  ├─ "main" branch  → app metadata (users, sessions, progress)
  └─ user branches  → one per (user_id, lesson_slug)
```

Each query is a **single HTTP request** — no persistent WebSocket. The "shell" is a client-side terminal emulator; the server is stateless aside from the branch registry. This keeps Vercel-deployable.

## Stack
- **Next.js 15** App Router + TypeScript + React 19
- **better-auth** — email/password + GitHub OAuth (fits OSS audience)
- **Drizzle** over Postgres on Xata "main" for app metadata
- **`pg`** client server-side for user branches
- **xterm.js** + `xterm-addon-fit`
- **next-mdx-remote** for lesson MDX
- **Tailwind v4** + shadcn/ui primitives
- **Vercel** deploy + Vercel Cron for branch cleanup

## Data model (app DB)

```
-- better-auth managed
users, sessions, accounts

-- app-owned
user_branches(user_id, lesson_slug, xata_branch_name,
              created_at, last_used_at, completed_at)
lesson_progress(user_id, lesson_slug, check_id, passed_at)
```

## Lesson format (OSS-friendly)

```
/lessons/01-select-basics/
  lesson.mdx       # prose, fenced sql, <Check id="..." />
  lesson.yaml      # metadata + optional checks
  seed.sql         # schema + data for the branch
```

**lesson.yaml**
```yaml
slug: 01-select-basics
title: SELECT basics
order: 1
difficulty: beginner
estimatedMinutes: 10
tags: [select, where]
authors: [exekias]
seed: seed.sql
checks:                          # OPTIONAL
  - id: count-users
    type: query-returns
    sql: SELECT count(*) FROM users
    expect: { rowCount: 1, rows: [[10]] }
  - id: has-active-col
    type: schema-state
    table: users
    column: is_active
    columnType: boolean
```

**Check types (v1):** `query-returns` · `schema-state` · `row-count`. All optional — lessons without checks render fine and don't block progress.

**MDX components available to authors:** `<Check id="..." />`, `<RunBlock>` (a code fence with a "Run" button that pipes into the shell).

## Web shell

- xterm.js renders the terminal; **all line-editing, history, and meta-commands are client-side**
- Statements accumulate until `;` (psql convention)
- History persisted in `localStorage` per user
- Meta-commands rewritten to system-catalog queries in JS: `\d \dt \dn \df \l \?`
- Output formatter: psql-style ascii table with column widths + `(N rows)`; errors red; notices yellow
- Server endpoint: `POST /api/lessons/[slug]/query { sql }` → `{ rows, fields, rowCount, notices, duration }` or `{ error }`
- v1: cap 1000 rows. SSE streaming = post-v1.

## Xata branch lifecycle

1. **First open of lesson** → server creates branch `u_<userHash>_<lessonSlug>`, runs `seed.sql`, inserts `user_branches` row.
2. **Subsequent opens** → reuse same branch.
3. **"Reset lesson"** → drop + recreate.
4. **Cleanup cron (daily)** → drop branches idle > 7 days; per-user cap = N (oldest evicted).
5. **Post-v1 optimization** → maintain per-lesson **template branches**; user branches fork from template (instant) instead of re-seeding.

## Auth flow (better-auth)
- `/sign-in` `/sign-up` — email/password + GitHub OAuth button
- Middleware guards `/lessons/[slug]` (interactive) and `/dashboard`
- Public: landing, catalog, `/lessons/[slug]/preview` (read-only MDX, no shell)

## Repo layout

```
/app
  /(public)/page.tsx                         # landing
  /(public)/lessons/page.tsx                 # catalog
  /(public)/lessons/[slug]/preview/page.tsx
  /(auth)/sign-in/page.tsx
  /(auth)/sign-up/page.tsx
  /(app)/dashboard/page.tsx
  /(app)/lessons/[slug]/page.tsx             # interactive
  /api/auth/[...all]/route.ts
  /api/lessons/[slug]/query/route.ts
  /api/lessons/[slug]/check/[id]/route.ts
  /api/lessons/[slug]/reset/route.ts
  /api/cron/cleanup-branches/route.ts
/lib
  auth.ts  db.ts  xata.ts  pg.ts  lessons.ts  checks.ts
/components/shell
  Terminal.tsx  readline.ts  format.ts  meta.ts
/components/lesson
  Check.tsx  RunBlock.tsx
/lessons                                     # OSS content
/db/schema.ts  /db/migrations
/scripts/new-lesson.ts  /scripts/validate-lesson.ts
CONTRIBUTING.md
.github/workflows/ci.yml
```

## OSS contribution workflow
- `CONTRIBUTING.md` walks through authoring a lesson
- `pnpm new-lesson <slug>` scaffolds the folder
- CI runs `validate-lesson.ts`: Zod-validate YAML, run `seed.sql` against an ephemeral Postgres, compile MDX, execute every declared check against the seed
- Catalog is generated at build time from `/lessons/*` — no DB row needed for lesson definitions; code is source of truth

## Phased delivery (~2 weeks v1)

| Phase | Scope | ~Days |
|---|---|---|
| 0 — Skeleton | Next.js + TS + Tailwind + Drizzle + Xata main + better-auth (email/pw + GitHub) + protected route | 1–2 |
| 1 — Content pipeline | Lesson loader, MDX, YAML Zod schema, catalog, read-only preview, `new-lesson` script, CI validator | 2–3 |
| 2 — Branch manager | Xata API wrapper, `user_branches` table, create-on-first-open, seed runner, reset, cleanup cron | 2 |
| 3 — Web shell | xterm.js + client readline + history + query endpoint + psql formatter + `\d \dt \l \?` | 3–4 |
| 4 — Optional checks | `<Check>` component, check runner, progress persistence, lesson UI | 2 |
| 5 — Polish & launch | Landing, dashboard, rate limit, per-query `statement_timeout`, 3–5 seed lessons authored | 2 |

## Risks & open questions
- **Xata branch quotas / creation rate** — spike early in Phase 2 to confirm the plan supports N branches per user with daily turnover.
- **Query safety on user branches** — set `statement_timeout = 5s`, connect as a role without `pg_read_server_files` / `COPY FROM PROGRAM`. Branch isolation already protects other users.
- **Connection management** — short-lived `pg.Client` per request (no per-(user,lesson) pool). Optional small LRU with idle timeout if latency demands it.
- **Cold-start on first open** — branch create + seed can take seconds. Show "preparing your sandbox" spinner; template-branch optimization removes this in Phase 6.
- **Long results** — capped at 1000 rows in v1; SSE streaming later.
- **Check determinism** — `query-returns` needs documented convention: either set-equal compare or require lesson author to `ORDER BY`.
