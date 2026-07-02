-- Seed for "02-functions": a tiny catalog to compute over. products holds a
-- handful of items with a net price; the lesson writes functions that turn
-- those prices into gross (tax-inclusive) amounts and bucket them by size.

CREATE TABLE products (
  id    int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  text    NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0)
);

INSERT INTO products (name, price) VALUES
  ('Notebook',   4.50),
  ('Desk lamp', 29.99),
  ('Keyboard',  79.00),
  ('Monitor',  199.00),
  ('Chair',    149.50),
  ('Mouse',     19.90);
