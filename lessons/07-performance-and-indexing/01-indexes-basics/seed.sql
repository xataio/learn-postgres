-- Seed for "01-indexes-basics": one wide-ish events table, deliberately LARGE so
-- an index's win shows up on the clock, not just in the plan. ~3,000,000 rows
-- built with generate_series (no literal rows), so the file stays tiny even
-- though the table doesn't. Branch creation runs this once (a few seconds); at
-- this size a Seq Scan lands in the tens of milliseconds while an Index Scan
-- stays well under one -- a gap EXPLAIN ANALYZE makes obvious. (Bump the series
-- upper bound if you want the contrast even starker.)
-- Distributions are deliberate: user_id is high-cardinality (~30,000 distinct
-- users, so a single user's ~100 rows are a tiny fraction (~0.003%) of the table
-- -> ideal index candidate), while status has only a handful of values with one
-- that dominates (~80% 'ok', so filtering on it is low-selectivity and the
-- planner skips the index).

CREATE TABLE events (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    int  NOT NULL,
  status     text NOT NULL,
  created_at timestamptz NOT NULL,
  amount     numeric(10, 2) NOT NULL
);

INSERT INTO events (user_id, status, created_at, amount)
SELECT
  1 + (g % 30000),                                 -- ~30,000 distinct users
  CASE
    WHEN g % 100 < 80 THEN 'ok'                    -- ~80% of rows
    WHEN g % 100 < 93 THEN 'pending'               -- ~13%
    WHEN g % 100 < 99 THEN 'failed'                -- ~6%
    ELSE 'refunded'                                -- ~1%
  END,
  TIMESTAMPTZ '2024-01-01 00:00:00+00' + (g * INTERVAL '5 minutes'),
  round((5 + (g % 500) * 0.37)::numeric, 2)
FROM generate_series(1, 3000000) AS g;
