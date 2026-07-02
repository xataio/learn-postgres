-- Seed for "04-window-functions-advanced": a small time series. daily_sales
-- holds one amount per region per day across two regions (north, south) for
-- three consecutive weeks, so PARTITION BY region + ORDER BY day makes running
-- totals, moving averages, and LAG/LEAD deltas natural. Amounts are generated
-- with a deterministic wobble so the numbers read like real sales, not a ramp.

CREATE TABLE daily_sales (
  day    date NOT NULL,
  region text NOT NULL,
  amount int  NOT NULL CHECK (amount > 0),
  PRIMARY KEY (day, region)
);

INSERT INTO daily_sales (day, region, amount)
SELECT
  d::date,
  r.region,
  r.base
    + 30 * (extract(dow FROM d)::int)                       -- weekday shape
    + (CASE WHEN extract(dow FROM d) IN (0, 6) THEN 200 ELSE 0 END)  -- weekend bump
    + 50 * ((d::date - DATE '2024-01-01') / 7)             -- gentle week-over-week growth
    AS amount
FROM generate_series(DATE '2024-01-01', DATE '2024-01-21', INTERVAL '1 day') AS d
CROSS JOIN (VALUES ('north', 500), ('south', 300)) AS r(region, base);
