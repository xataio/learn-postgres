-- Seed for "01-indexes-basics": one wide-ish events table, big enough that an
-- index visibly beats a sequential scan. ~50,000 rows built with generate_series
-- (no literal rows). Distributions are deliberate: user_id is high-cardinality
-- (~5,000 distinct users, so a single user's rows are a tiny fraction of the
-- table -> good index candidate), while status has only a handful of values with
-- one that dominates (~80% 'ok', so filtering on it is low-selectivity).

CREATE TABLE events (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    int  NOT NULL,
  status     text NOT NULL,
  created_at timestamptz NOT NULL,
  amount     numeric(10, 2) NOT NULL
);

INSERT INTO events (user_id, status, created_at, amount)
SELECT
  1 + (g % 5000),                                  -- ~5,000 distinct users
  CASE
    WHEN g % 100 < 80 THEN 'ok'                    -- ~80% of rows
    WHEN g % 100 < 93 THEN 'pending'               -- ~13%
    WHEN g % 100 < 99 THEN 'failed'                -- ~6%
    ELSE 'refunded'                                -- ~1%
  END,
  TIMESTAMPTZ '2024-01-01 00:00:00+00' + (g * INTERVAL '5 minutes'),
  round((5 + (g % 500) * 0.37)::numeric, 2)
FROM generate_series(1, 50000) AS g;
