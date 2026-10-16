# Fix plan — learn.database.tech first-run

**Repo:** [xataio/learn-postgres](https://github.com/xataio/learn-postgres)
**Live:** https://learn.database.tech
**Goal:** A brand-new visitor can run `SELECT * FROM users` in under two minutes without needing an existing GitHub account.

Original product `PLAN.md` already called for email/password; it was never shipped. This plan maps 1:1 to the audited first-session failures.

---

## Success metrics

| Metric | Today | Target |
|--------|-------|--------|
| Apex `database.tech` | NXDOMAIN | 301 → learn.database.tech |
| Anonymous visitor can run lesson-1 SQL | No | Yes (guest or email) |
| Auth options | GitHub only | GitHub + email/password |
| Landing primary CTA | Sign in with GitHub | Start SELECT basics |
| Mobile catalog Sign-in clipped / tags truncated | Yes | No |
| Lesson 1 check | Sandbox health click | Real SQL skill check |

---

## Workstreams

### P0 — Ops: make the brand domain work (outside app code)

**Owner:** whoever controls Namecheap DNS for `database.tech`

1. Add apex + `www` to the Vercel project that serves `learn.database.tech`.
2. At registrar: apex A/ALIAS to Vercel; `www` CNAME to Vercel target.
3. Prefer redirect apex → `https://learn.database.tech` until brand decision is final.
4. Verify: `dig database.tech A`, `curl -I https://database.tech` → 301/200.

### P1 — Landing + catalog first-run (no new infra) — IN THIS PR

- Primary CTA → `/lessons/select-basics`
- Drop “no resets” copy (product has Reset)
- Link `/lessons`; theme toggle on homepage; `database.tech` brand line
- Catalog “Start here” for signed-out users; clearer signed-in empty state
- Mobile: stack header; wrap tags instead of truncate

### P2 — Email/password auth — IN THIS PR

- Enable `emailAndPassword` in better-auth
- `/sign-in` + `/sign-up` with email form + GitHub
- Retarget SignInButton / sandbox prompts to `/sign-in`
- Skip email verification for MVP (no SMTP yet)

### P3 — Guest demo sandbox for `select-basics` — FOLLOW-UP

Cookie-bound guest identity + synthetic `user` row; allowlist `select-basics` only; reuse `ensureBranchForLesson`; IP + create rate limits; short idle TTL; soft upsell after first query.

### P4 — Lesson 1 skill check — IN THIS PR

Replace `seed-loaded` health check with `query-returns` counting active users (= 7).

### P5 — Brand decision

Align H1 / OAuth app name / OG / domain as either database.tech or Learn Postgres.

---

## Ship order

1. P1 + P0 (landing/catalog/mobile + DNS)
2. P2 + P4 (email auth + real check) ← this PR
3. P3 (guest sandbox)
4. P5 (brand)

## Verification

1. `https://database.tech` → product (after P0)
2. Phone-width `/lessons` — Sign in visible; tags readable
3. Homepage → Start SELECT basics → email sign-up → run query
4. Lesson 1 check fails until correct SQL, then passes
5. GitHub OAuth still works
