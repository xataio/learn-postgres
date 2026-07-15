-- Seed for "04-capstone-troubleshooting": one wide, realistic orders table.
-- 300,000 orders spread across 5,000 customers over ~two years. That makes any
-- single customer a needle in a haystack (~60 rows out of 300k), so the target
-- query "recent orders for one customer, newest first" is genuinely slow with
-- no supporting index: a full Seq Scan plus a Sort. There is intentionally no
-- index on customer_id or created_at yet — the learner adds the fix. We ANALYZE
-- at the end so the planner has fresh statistics and its plans are trustworthy.

CREATE TABLE orders (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id int         NOT NULL,
  created_at  timestamptz NOT NULL,
  status      text        NOT NULL,
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0)
);

-- 300k rows: customer_id is uniformly spread over 5,000 customers (high
-- cardinality, so a filter on one customer is very selective), created_at is
-- scattered across roughly two years, and status/amount are plausible filler.
INSERT INTO orders (customer_id, created_at, status, amount)
SELECT (g % 5000) + 1,
       timestamptz '2023-01-01 00:00:00'
         + ((g * 3607) % 63072000) * interval '1 second',
       (ARRAY['pending', 'paid', 'shipped', 'refunded'])[(g % 4) + 1],
       round((10 + (g % 4000) * 0.25)::numeric, 2)
FROM generate_series(0, 299999) AS g;

ANALYZE orders;
