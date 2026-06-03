-- Seed for "04-subqueries": customers and their orders. Enough variety to show
-- a scalar subquery (compare against the global average), IN/EXISTS (who has
-- ordered), correlated subqueries (per-customer comparisons), and LATERAL
-- (each customer's most expensive order). One customer has no orders at all so
-- EXISTS / NOT EXISTS have something to separate.

CREATE TABLE customers (
  id      serial PRIMARY KEY,
  name    text   NOT NULL,
  country text   NOT NULL
);

INSERT INTO customers (name, country) VALUES
  ('Ada Lovelace',      'UK'),   -- 1
  ('Grace Hopper',      'US'),   -- 2
  ('Linus Torvalds',    'FI'),   -- 3
  ('Margaret Hamilton', 'US'),   -- 4
  ('Edsger Dijkstra',   'NL');   -- 5, places no orders

CREATE TABLE orders (
  id          serial  PRIMARY KEY,
  customer_id int     NOT NULL REFERENCES customers(id),
  product     text    NOT NULL,
  amount      numeric NOT NULL,
  placed_at   date    NOT NULL
);

INSERT INTO orders (customer_id, product, amount, placed_at) VALUES
  (1, 'Keyboard',  120, '2024-01-05'),
  (1, 'Monitor',   340, '2024-02-11'),
  (1, 'Mouse',      45, '2024-03-02'),
  (2, 'Laptop',   1450, '2024-01-20'),
  (2, 'Dock',      210, '2024-04-08'),
  (3, 'Webcam',     90, '2024-02-15'),
  (3, 'Mic',       160, '2024-05-19'),
  (3, 'Headphones',230, '2024-06-01'),
  (4, 'Tablet',    600, '2024-03-30');
