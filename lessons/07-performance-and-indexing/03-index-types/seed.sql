-- Seed for "03-index-types": one docs table wide enough that specialized index
-- choices actually matter. ~40,000 rows built with generate_series (no literal
-- rows). Columns are chosen to demonstrate each access method:
--   tags   text[]   -> GIN (array containment / overlap)
--   meta   jsonb    -> GIN (jsonb @>, ? existence)
--   status text     -> partial index (one value dominates)
--   email  text     -> expression index on lower(email)
--   created_at       -> BRIN (rows are inserted in timestamp order, so the
--                       column is naturally correlated with physical position)
--   price / owner_id -> covering (INCLUDE) index demo

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
  1 + (g % 4000),                                    -- ~4,000 distinct owners
  CASE
    WHEN g % 100 < 90 THEN 'archived'                -- ~90% of rows dominate
    WHEN g % 100 < 98 THEN 'active'                  -- ~8%
    ELSE 'draft'                                      -- ~2%
  END,
  'User' || (g % 4000) || '@Example.com',            -- mixed case, for lower()
  CASE
    WHEN g % 3 = 0 THEN ARRAY['sql', 'index']
    WHEN g % 3 = 1 THEN ARRAY['jsonb', 'gin', 'sql']
    ELSE ARRAY['brin', 'gist']
  END,
  jsonb_build_object(
    'kind', CASE WHEN g % 4 = 0 THEN 'report' ELSE 'note' END,
    'priority', g % 5,
    'tags', to_jsonb(ARRAY['a', 'b'])
  ),
  round((5 + (g % 500) * 0.37)::numeric, 2),
  TIMESTAMPTZ '2024-01-01 00:00:00+00' + (g * INTERVAL '10 minutes')
FROM generate_series(1, 40000) AS g;

ANALYZE docs;
