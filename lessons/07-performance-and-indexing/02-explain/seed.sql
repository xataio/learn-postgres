-- Seed for "02-explain": two related tables to produce interesting plans.
-- customers holds ~4,000 people; orders holds ~40,000 rows, each pointing at a
-- customer. Built with generate_series (no literal rows). An index on
-- orders.customer_id lets the planner choose an Index Scan / Nested Loop for a
-- single customer, while a low-cardinality status column (one value dominates)
-- shows when a Seq Scan or Bitmap scan wins instead. ANALYZE runs at the end so
-- the planner has fresh statistics and its estimates line up with reality.

CREATE TABLE customers (
  id      int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  country text NOT NULL
);

INSERT INTO customers (name, country)
SELECT
  'Customer ' || g,
  (ARRAY['US', 'DE', 'FR', 'JP', 'BR'])[1 + (g % 5)]
FROM generate_series(1, 4000) AS g;

CREATE TABLE orders (
  id          int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id int  NOT NULL REFERENCES customers (id),
  status      text NOT NULL,
  created_at  timestamptz NOT NULL,
  amount      numeric(10, 2) NOT NULL
);

INSERT INTO orders (customer_id, status, created_at, amount)
SELECT
  1 + (g % 4000),                                  -- spread across all customers
  CASE
    WHEN g % 100 < 85 THEN 'shipped'               -- ~85% of rows
    WHEN g % 100 < 96 THEN 'pending'               -- ~11%
    ELSE 'cancelled'                               -- ~4%
  END,
  TIMESTAMPTZ '2024-01-01 00:00:00+00' + (g * INTERVAL '10 minutes'),
  round((10 + (g % 900) * 0.5)::numeric, 2)
FROM generate_series(1, 40000) AS g;

-- An index the planner can reach for when filtering orders by customer.
CREATE INDEX orders_customer_id_idx ON orders (customer_id);

-- Refresh statistics so the planner's row estimates match the real data.
ANALYZE customers;
ANALYZE orders;
