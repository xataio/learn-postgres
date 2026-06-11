-- Seed for "04-ddl-and-schemas": a small product catalog to practice DDL on.
-- The lesson is about changing structure, not querying data, so the seed stays
-- tiny — just enough rows that ALTER TABLE has something to carry along.

CREATE TABLE products (
  id    int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  text NOT NULL,
  price numeric(8,2) NOT NULL
);

INSERT INTO products (name, price) VALUES
  ('Mechanical keyboard', 89.00),
  ('USB-C dock',          129.50),
  ('Laptop stand',        39.99),
  ('Webcam',              59.00);
