-- Seed for "04-window-functions-advanced": monthly revenue data for a small
-- SaaS company. Three products over 12 months — perfect for running totals,
-- LAG/LEAD comparisons, and frame experiments.

CREATE TABLE monthly_revenue (
  id        int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product   text NOT NULL,
  month     date NOT NULL,
  revenue   numeric(10,2) NOT NULL CHECK (revenue >= 0)
);

INSERT INTO monthly_revenue (product, month, revenue) VALUES
  ('Basic',  '2024-01-01',  4200),
  ('Basic',  '2024-02-01',  4500),
  ('Basic',  '2024-03-01',  4100),
  ('Basic',  '2024-04-01',  4800),
  ('Basic',  '2024-05-01',  5200),
  ('Basic',  '2024-06-01',  5000),
  ('Pro',    '2024-01-01', 12000),
  ('Pro',    '2024-02-01', 13500),
  ('Pro',    '2024-03-01', 11800),
  ('Pro',    '2024-04-01', 14200),
  ('Pro',    '2024-05-01', 15000),
  ('Pro',    '2024-06-01', 14800),
  ('Enterprise', '2024-01-01', 28000),
  ('Enterprise', '2024-02-01', 29500),
  ('Enterprise', '2024-03-01', 27000),
  ('Enterprise', '2024-04-01', 31000),
  ('Enterprise', '2024-05-01', 32500),
  ('Enterprise', '2024-06-01', 33000);
