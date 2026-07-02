-- Seed for "03-index-types": one docs table, deliberately LARGE (~5,000,000 rows)
-- so specialized index choices show up on the clock, not just in the plan. Built
-- with generate_series (no literal rows), and seeded ONCE into the base branch
-- (learners get instant copy-on-write branches), so table size costs nothing at
-- lesson-open time. Each column maps to the index that wins for it:
--   tags   text[]   -> GIN (array containment); a rare 'gin' tag (~1%) stays selective
--   meta   jsonb    -> GIN (@> containment and ? existence); 'report' and 'pinned' ~1%
--   status text     -> partial index (one value dominates, ~90% archived)
--   email  text     -> hash (exact email) and an expression index on lower(email)
--   owner_id int    -> covering (INCLUDE) index; ~500k owners, so a lookup returns
--                      few rows and the demo yields a true Index Only Scan
--   created_at       -> BRIN (inserted in time order -> correlated with physical page)
-- NOTE: no VACUUM here on purpose. The seed runs as a single implicit transaction
-- and VACUUM can't run inside one; the high owner cardinality is what keeps the
-- covering demo an Index Only Scan without it.

CREATE TABLE docs (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id   int  NOT NULL,
  status     text NOT NULL,
  email      text NOT NULL,
  tags       text[] NOT NULL,
  meta       jsonb  NOT NULL,
  price      numeric(10, 2) NOT NULL,
  created_at timestamptz NOT NULL
);

INSERT INTO docs (owner_id, status, email, tags, meta, price, created_at)
SELECT
  1 + (g % 500000),                                    -- ~500,000 owners: few rows each
  CASE
    WHEN g % 100 < 90 THEN 'archived'                  -- ~90% of rows dominate
    WHEN g % 100 < 98 THEN 'active'                    -- ~8%
    ELSE 'draft'                                       -- ~2%
  END,
  'User' || (g % 50000) || '@Example.com',             -- mixed case, ~50k distinct
  CASE
    WHEN g % 100 = 0 THEN ARRAY['sql', 'gin', 'featured']  -- ~1% carry the rare 'gin' tag
    WHEN g % 3 = 0 THEN ARRAY['sql', 'index']
    WHEN g % 3 = 1 THEN ARRAY['jsonb', 'sql']
    ELSE ARRAY['brin', 'gist']
  END,
  jsonb_build_object(
    'kind', CASE WHEN g % 100 = 1 THEN 'report' ELSE 'note' END,  -- 'report' ~1%
    'views', g % 1000
  ) || CASE WHEN g % 100 = 7 THEN '{"pinned": true}'::jsonb ELSE '{}'::jsonb END,  -- 'pinned' ~1%
  round((5 + (g % 500) * 0.37)::numeric, 2),
  TIMESTAMPTZ '2024-01-01 00:00:00+00' + (g * INTERVAL '1 minute')
FROM generate_series(1, 5000000) AS g;

ANALYZE docs;
