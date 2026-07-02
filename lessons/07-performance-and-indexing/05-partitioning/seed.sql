-- Seed for "05-partitioning": a time-series style table of sensor readings.
-- measurements is a RANGE-partitioned parent split by month, with three monthly
-- child partitions pre-created. We populate a few thousand rows spread evenly
-- across the three months so partition pruning and per-partition counts are real.

CREATE TABLE measurements (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  sensor_id   int         NOT NULL,
  recorded_at timestamptz NOT NULL,
  reading     numeric(6,2) NOT NULL,
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE measurements_2024_01 PARTITION OF measurements
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE measurements_2024_02 PARTITION OF measurements
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE measurements_2024_03 PARTITION OF measurements
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- 4368 rows: one reading every 30 minutes across the three months, cycling
-- 5 sensors. Jan gets 1488, Feb (leap) 1392, Mar 1488 — exactly filling the
-- three partitions with nothing left over.
INSERT INTO measurements (sensor_id, recorded_at, reading)
SELECT (g % 5) + 1,
       timestamptz '2024-01-01 00:00:00' + (g * interval '30 minutes'),
       round((20 + (g % 100) * 0.1)::numeric, 2)
FROM generate_series(0, 4367) AS g;
