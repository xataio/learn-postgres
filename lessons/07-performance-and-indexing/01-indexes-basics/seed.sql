-- Seed for "01-indexes-basics": one wide-ish events table, deliberately LARGE so
-- an index's win shows up on the clock, not just in the plan. ~25,000,000 rows
-- built with generate_series (no literal rows), so the file stays tiny even
-- though the table is ~1.5 GB. This is seeded ONCE into the base branch; learners
-- get instant copy-on-write branches, so table size costs nothing at lesson-open
-- time. At this size a Seq Scan lands in the hundreds of milliseconds while an
-- Index Scan stays well under one -- a gap EXPLAIN ANALYZE makes unmistakable.
-- (Bump the series upper bound for an even starker contrast; note the CREATE
-- INDEX exercises write per-learner, and index size scales with the row count.)
-- Distributions are deliberate: user_id is high-cardinality (~250,000 distinct
-- users, so a single user's ~100 rows are a tiny fraction of the table -> ideal
-- index candidate), while status has only a handful of values with one that
-- dominates (~80% 'ok', so filtering on it is low-selectivity and the planner
-- skips the index).

CREATE TABLE events (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    int  NOT NULL,
  status     text NOT NULL,
  created_at timestamptz NOT NULL,
  amount     numeric(10, 2) NOT NULL
);

INSERT INTO events (user_id, status, created_at, amount)
SELECT
  1 + (g % 250000),                                -- ~250,000 distinct users
  CASE
    WHEN g % 100 < 80 THEN 'ok'                    -- ~80% of rows
    WHEN g % 100 < 93 THEN 'pending'               -- ~13%
    WHEN g % 100 < 99 THEN 'failed'                -- ~6%
    ELSE 'refunded'                                -- ~1%
  END,
  TIMESTAMPTZ '2024-01-01 00:00:00+00' + (g * INTERVAL '5 minutes'),
  round((5 + (g % 500) * 0.37)::numeric, 2)
FROM generate_series(1, 25000000) AS g;
