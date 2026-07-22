# Contributing

Thanks for helping people learn Postgres! There are two kinds of
contributions here:

- **Lessons** — new lessons, fixes, and clarifications under
  [`/lessons`](./lessons). This is the heart of the project and the most
  valuable thing you can work on.
- **App code** — the Next.js app that renders lessons and runs the sandboxes.

For local setup, see [Getting started](./README.md#getting-started-local-dev)
in the README. You don't need Xata credentials to author lessons — the dev
server renders lesson prose without them.

## Lesson anatomy

The course is organized as modules containing lessons:

```
lessons/
  02-changing-data/              # module folder
    module.yaml                  # module metadata
    01-insert/                   # lesson folder
      lesson.yaml                # lesson metadata + optional checks
      lesson.mdx                 # the prose, with runnable SQL blocks
      seed.sql                   # schema + data for the learner's sandbox
    02-update/
    ...
```

Ordering and slugs come **from the folder names** — `02-changing-data` is
module 2 with slug `changing-data`; there are no `slug:` or `order:` fields in
the YAML. Renaming a folder renames the lesson.

### Scaffolding

```bash
npm run new-lesson -- <module-slug> <lesson-slug>
# e.g.
npm run new-lesson -- programmability event-triggers
```

This creates the lesson folder with the next free number in that module and
placeholder files. Then validate as you edit:

```bash
npm run lessons:validate
```

The validator checks YAML schemas, folder structure, seed existence, and that
every `<Check id>` in the MDX exists in the YAML. `npm run build` additionally
compiles every lesson's MDX — CI runs both on every PR.

### `lesson.yaml`

Validated against [`lib/lesson-schema.ts`](./lib/lesson-schema.ts):

```yaml
title: DELETE and row lifecycle          # required
summary: Remove rows — and understand where they go.
estimatedMinutes: 10                     # required — keep it honest
tags: [delete, returning]
authors: [your-github-handle]
seed: seed.sql                           # default: seed.sql
checks: []                               # optional, see below
```

Difficulty lives on the module, not the lesson.

### `module.yaml`

Only needed when creating a brand-new module:

```yaml
title: Changing data
difficulty: beginner                     # beginner | intermediate | advanced
summary: INSERT, UPDATE, DELETE — and getting data back out with RETURNING.
```

## Writing `lesson.mdx`

Plain Markdown plus two components:

- **`<Run>`** — SQL the learner executes in their sandbox with one click.
- **`<Check id="…">`** — a checkpoint; references a check declared in
  `lesson.yaml`. The body is the learner-facing instruction.
- Plain fenced blocks (```` ```sql ````) render as read-only snippets — use
  them for SQL the learner reads but shouldn't run.

````mdx
Count the seeded rows:

<Run>
SELECT count(*) FROM users;
</Run>

<Check id="ten-users">
You should see **10** users.
</Check>
````

### Escaping inside `<Run>` and `<Check>` — read this

Block contents are parsed as **JSX**, so some perfectly valid SQL breaks the
MDX compile or, worse, silently changes meaning. The backslashes below are
stripped at render time — the learner always sees and runs clean SQL.

- Escape every `{` and `}` as `\{` and `\}`. This bites on jsonb and array
  literals:

  ```
  SELECT '\{"a": 1\}'::jsonb;
  SELECT '\{1,2,3\}'::int[];
  ```

- Escape every `<` as `\<` — so `\<=`, `\<>`, `\<@`, `\<->`. The `>` character
  needs **no** escaping (`->`, `->>`, `#>`, `@>` are all fine as-is).

- **No `--` line comments inside `<Run>`.** The runner flattens the block to a
  single line, so a `--` comment swallows the rest of the statement. Put
  commentary in the surrounding prose instead.

- A lone `*` (as in `count(*)`) needs no escaping. If a block contains **two or
  more** `*` characters, MDX can pair them up as emphasis — escape each one as
  `\*`.

- If a block is *supposed* to fail (demonstrating an error), say so in the
  sentence leading into it — an unannounced failing block reads as a bug in
  the lesson.

To check your work, run `npm run lessons:validate` and `npm run build`, or
just open the lesson in the dev server (`/lessons/<slug>`).

## `seed.sql`

Runs once against a fresh branch to build the lesson's world. Assume:

- An **empty `public` schema**.
- A **regular role** — no `SUPERUSER`, and **no `CREATE EXTENSION`**. Stick to
  core Postgres: `gen_random_uuid()`, built-in full-text search, etc.
  (`pg_trgm`, `btree_gist`, `uuid-ossp` are out of scope.)

Seeds run **once into a per-lesson template branch** at deploy time; learners
get instant copy-on-write forks. That means big tables are essentially free at
lesson-open time — the indexing lessons seed millions of rows via
`generate_series` so plan differences are visible in `EXPLAIN ANALYZE`. Keep
the *file* small (generate data, don't paste it), and remember that anything
the learner is asked to build themselves — like `CREATE INDEX` on a huge
table — runs per-learner and costs real time.

For most lessons, a handful of themed rows is still the right size.

## Checks

Checks are optional and only make sense when the lesson asks the learner to
**change state** (DML/DDL) that we can verify afterwards. Queries themselves
are stateless — we can't observe "did they type the right SELECT" — so
**SELECT-only lessons should ship `checks: []`** rather than a checkpoint that
auto-passes.

Three types:

```yaml
# query-returns — run SQL, compare the result
- id: orders-archived
  type: query-returns
  description: Archive the 3 cancelled orders.
  sql: SELECT count(*) FROM orders_archive
  expect:
    rowCount: 1
    rows: [[3]]

# row-count — assert a table has exactly N rows
- id: ten-orders
  type: row-count
  description: Insert 10 orders.
  table: orders
  expect:
    rowCount: 10

# schema-state — assert a column exists with a given type
- id: has-is-active
  type: schema-state
  description: Add an is_active boolean to users.
  table: users
  column: is_active
  columnType: boolean
```

Two tips:

- `query-returns` comparisons are order-sensitive — include an `ORDER BY` if
  row order isn't deterministic.
- `query-returns` can query the catalogs, which makes almost anything
  checkable. To verify "the learner created an index on `user_id`" without
  depending on what they named it:

  ```sql
  SELECT count(*) FROM pg_indexes
  WHERE tablename = 'events' AND indexdef ILIKE '%(user_id)%'
  ```

## Writing style

- **Show, don't tell.** Drop them into the query, then explain what they saw.
- **Short paragraphs.** A learner should be able to skim and still pick up the
  shape of the lesson.
- **One concept per lesson.** If you're writing "next, an unrelated thing…",
  split it into a follow-up lesson.
- **Be specific about cost and behavior.** The best Postgres lessons explain
  *why* something is the right tool, not just *that* it is.

## Pull requests

- Branch from `main`; for lessons, `lesson/<slug>` is the convention.
- One lesson (or one focused fix) per PR.
- CI must pass — it runs `tsc --noEmit`, `eslint`,
  `npm run lessons:validate`, and a full `next build`.
- Add your GitHub handle to `authors` in any lesson you meaningfully improve.

For app code: this repo tracks a newer Next.js than most tutorials (and
coding-agent training data) assume — conventions may differ from what you
know. The bundled docs in `node_modules/next/dist/docs/` are the source of
truth, and `AGENTS.md` points coding agents at them.

## License

By contributing you agree that your contributions are licensed under the
project's [Apache 2.0 license](./LICENSE).
