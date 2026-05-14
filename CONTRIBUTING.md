# Contributing a lesson

Lessons are the heart of this project. Every one lives in its own folder under
[`/lessons`](./lessons) and is a self-contained unit: prose, sandbox seed, and
optional checks. PRs that add or refine lessons are very welcome.

## Lesson folder

```
/lessons/<order-slug>/
  lesson.yaml        # metadata, optional checks, seed reference
  lesson.mdx         # the prose, with embedded SQL and components
  seed.sql           # schema + data loaded into the learner's Postgres branch
```

Folder names use `<order>-<kebab-slug>` — e.g., `01-select-basics`,
`07-window-functions`. The numeric prefix matches `order:` in the YAML and
controls catalog ordering.

## Scaffolding a new lesson

```bash
npm run new-lesson -- 04-grouping-and-aggregates
```

This drops a placeholder folder with the right files. Edit them, then validate:

```bash
npm run lessons:validate
```

CI runs the same check on every PR.

## `lesson.yaml`

Validated against a Zod schema in [`lib/lesson-schema.ts`](./lib/lesson-schema.ts).

```yaml
slug: 04-grouping-and-aggregates       # must equal folder name
title: Grouping and aggregates
summary: GROUP BY, COUNT, SUM — and why HAVING isn't WHERE.
order: 4                                # integer; matches folder prefix
difficulty: beginner                    # beginner | intermediate | advanced
estimatedMinutes: 12
tags: [group-by, aggregates, having]
authors: [your-github-handle]
seed: seed.sql                          # relative path; default is seed.sql
checks: []                              # optional, see below
```

Keep `estimatedMinutes` honest — short, hands-on lessons are the goal.

## `lesson.mdx`

Plain Markdown plus a tiny set of components.

### `<Run>` — a runnable SQL block

Wrap SQL you want learners to execute in their sandbox. In an interactive
session there's a "Run" button; in the preview it renders as a styled block.

````mdx
<Run>
SELECT count(*) FROM users;
</Run>
````

### `<Check id="…">` — an optional checkpoint

References a check declared in `lesson.yaml` by `id`. The body is the learner-facing description.

```mdx
<Check id="seed-loaded">
Run a `SELECT count(*) FROM users` and you should see **10**.
</Check>
```

If you reference an `id` that's not in `lesson.yaml`, the validator fails.

### Fenced code blocks

Triple-backtick code blocks (```` ```sql … ``` ````) render as styled,
non-runnable blocks — use these for snippets the learner reads but doesn't
execute. Use `<Run>` when you want them to actually run it.

## Checks (`lesson.yaml`)

Checks are **optional**. Add them when you can verify an objective state of
the learner's Postgres branch — not "did they type the right query," because
queries are stateless and we can't observe them. Three types:

### `query-returns` — run SQL, compare result

```yaml
- id: seed-loaded
  type: query-returns
  description: Confirm the seed loaded 10 users.
  sql: SELECT count(*) FROM users
  expect:
    rowCount: 1
    rows: [[10]]
```

Order-sensitive. If row order isn't deterministic in your check, include an
explicit `ORDER BY` in the `sql`.

### `row-count` — assert a table has N rows

```yaml
- id: ten-orders-inserted
  type: row-count
  description: Insert 10 rows into the orders table.
  table: orders
  expect:
    rowCount: 10
```

### `schema-state` — assert a column exists with a given type

```yaml
- id: has-is-active
  type: schema-state
  description: The users table has an is_active boolean.
  table: users
  column: is_active
  columnType: boolean
```

> Auto-checking runs in Phase 4. Until then, `<Check>` components render as
> informational placeholders.

## `seed.sql`

Plain SQL that runs once against a fresh branch when the learner opens the
lesson. Assume:

- An empty `public` schema.
- A regular user role — no `SUPERUSER`, no `CREATE EXTENSION` calls.
- Idempotency isn't required (the branch starts empty) but is welcome.

Keep seeds small and themed to the lesson. A handful of rows is almost always
enough; 100k-row seeds slow branch creation for no learning benefit.

## Local development

```bash
npm install
cp .env.example .env.local           # then edit secrets
npm run db:migrate                   # one-time, against your Postgres
npm run dev
```

Visit:
- <http://localhost:3000/lessons> for the catalog
- <http://localhost:3000/lessons/<slug>/preview> for a read-only render

The interactive `/lessons/<slug>` route requires sign-in. Branch creation and
the web shell aren't wired yet — they land in Phases 2 and 3.

## What CI checks

On every PR:
- `tsc --noEmit` — types
- `eslint` — lint
- `npm run lessons:validate` — YAML schema, slug/folder match, seed exists,
  Check IDs in MDX exist in YAML
- `next build` — full MDX compile of every lesson

## Tone

- **Show, don't tell.** Drop them into the query, then explain.
- **Short paragraphs.** A learner should be able to skim and still pick up the
  shape of the lesson.
- **One concept per lesson.** If you find yourself writing "next, an unrelated
  thing…" split into a follow-up lesson.
- **Be specific about cost and behavior** — Postgres lessons are most useful
  when they explain *why* something is the right tool, not just *that* it is.
