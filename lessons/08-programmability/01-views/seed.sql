-- Seed for "01-views": a tiny storefront. customers holds a handful of people
-- (some marked inactive), and orders holds their purchases. There are enough
-- orders per customer that a per-customer aggregate is worth naming and reusing
-- as a view -- and expensive enough that a materialized view earns its keep.

CREATE TABLE customers (
  id        int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL,
  email     text NOT NULL,
  country   text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id          int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id int  NOT NULL REFERENCES customers (id),
  placed_on   date NOT NULL,
  amount      numeric(10, 2) NOT NULL CHECK (amount > 0)
);

INSERT INTO customers (name, email, country, is_active) VALUES
  ('Ada Lovelace',    'ada@example.com',    'UK', true),
  ('Grace Hopper',    'grace@example.com',  'US', true),
  ('Linus Torvalds',  'linus@example.com',  'FI', true),
  ('Margaret Hamilton','maggie@example.com','US', false),
  ('Sofia Kovalevskaya','sofia@example.com','RU', true);

INSERT INTO orders (customer_id, placed_on, amount) VALUES
  (1, '2026-01-05',  49.90),
  (1, '2026-02-11', 120.00),
  (1, '2026-03-02',  30.10),
  (2, '2026-01-20', 200.00),
  (2, '2026-02-28',  55.50),
  (3, '2026-01-14',  15.00),
  (3, '2026-02-05',  15.00),
  (3, '2026-03-19',  90.00),
  (4, '2026-01-09', 300.00),
  (5, '2026-02-22',  75.25),
  (5, '2026-03-30',  75.25);
