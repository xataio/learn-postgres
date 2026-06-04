-- Seed for "01-data-types": one products table that exercises the common type
-- families — integer identity key, numeric money, text, boolean, and an enum.
-- Small on purpose; the lesson is about the column types, not the data volume.

CREATE TYPE product_status AS ENUM ('draft', 'active', 'discontinued');

CREATE TABLE products (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku         text           NOT NULL UNIQUE,
  name        text           NOT NULL,
  price       numeric(10,2)  NOT NULL,
  weight_kg   real,
  in_stock    boolean        NOT NULL DEFAULT true,
  status      product_status NOT NULL DEFAULT 'active'
);

INSERT INTO products (sku, name, price, weight_kg, in_stock, status) VALUES
  ('KB-01', 'Mechanical keyboard', 119.99, 0.9,  true,  'active'),
  ('MN-27', '27-inch monitor',     339.00, 5.4,  true,  'active'),
  ('MS-09', 'Wireless mouse',       44.50, 0.08, false, 'active'),
  ('WC-04', '1080p webcam',         89.90, 0.12, true,  'draft'),
  ('DK-02', 'USB-C dock',          209.00, 0.35, true,  'discontinued');
