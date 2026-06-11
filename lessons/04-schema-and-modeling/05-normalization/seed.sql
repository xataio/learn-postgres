-- Seed for "05-normalization": one deliberately messy, denormalized table.
-- Every row is one line item of an order, with the customer's name/email and
-- the product's name/price copied onto it — and no primary key at all. The
-- redundancy is the point: the lesson surfaces the anomalies it causes, then
-- splits the table into customers / products / orders / order_items.

CREATE TABLE orders_flat (
  order_id       int          NOT NULL,
  order_date     date         NOT NULL,
  customer_name  text         NOT NULL,
  customer_email text         NOT NULL,
  product_name   text         NOT NULL,
  product_price  numeric(8,2) NOT NULL,
  quantity       int          NOT NULL
);

INSERT INTO orders_flat VALUES
  (101, '2024-03-01', 'Ada Lovelace', 'ada@example.com',   'Mechanical keyboard',  89.00, 1),
  (101, '2024-03-01', 'Ada Lovelace', 'ada@example.com',   'USB-C cable',          12.50, 2),
  (102, '2024-03-03', 'Grace Hopper', 'grace@example.com', '4K monitor',          279.00, 1),
  (102, '2024-03-03', 'Grace Hopper', 'grace@example.com', 'USB-C cable',          12.50, 1),
  (102, '2024-03-03', 'Grace Hopper', 'grace@example.com', 'Laptop stand',         45.00, 1),
  (103, '2024-03-07', 'Ada Lovelace', 'ada@example.com',   'Laptop stand',         45.00, 1),
  (104, '2024-03-10', 'Marie Curie',  'marie@example.com', 'Mechanical keyboard',  89.00, 1),
  (104, '2024-03-10', 'Marie Curie',  'marie@example.com', '4K monitor',          279.00, 2),
  (105, '2024-03-12', 'Grace Hopper', 'grace@example.com', 'Mechanical keyboard',  89.00, 1),
  (106, '2024-03-15', 'Ada Lovelace', 'ada@example.com',   '4K monitor',          279.00, 1),
  (106, '2024-03-15', 'Ada Lovelace', 'ada@example.com',   'USB-C cable',          12.50, 1),
  (107, '2024-03-18', 'Marie Curie',  'marie@example.com', 'USB-C cable',          12.50, 3);
