-- Seed for "02-vacuum-and-bloat": a single events table with 5,000 rows loaded
-- via generate_series. It's a plain heap table with default settings so the
-- learner can churn it with UPDATEs, watch dead tuples accumulate in
-- pg_stat_user_tables, reclaim them with VACUUM, and then re-create it with a
-- fillfactor to cut future bloat.

CREATE TABLE events (
  id       int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status   text NOT NULL,
  payload  int  NOT NULL
);

INSERT INTO events (status, payload)
SELECT 'pending', (g % 100) + 1
FROM generate_series(1, 5000) AS g;
