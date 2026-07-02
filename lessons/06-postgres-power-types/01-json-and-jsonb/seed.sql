-- Seed for "01-json-and-jsonb": a tiny product catalog. Each product carries a
-- jsonb `attributes` column holding a nested object (specs), a tags array, and
-- a price, so we can exercise access, containment, JSONPath, and modification.

CREATE TABLE products (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  attributes jsonb NOT NULL
);

INSERT INTO products (name, attributes) VALUES
  ('Trailhead Backpack',
   '{"brand": "Summit", "price": 129.00, "in_stock": true,
     "tags": ["outdoor", "sale", "waterproof"],
     "specs": {"liters": 30, "color": "green", "weight_g": 850}}'),
  ('Field Notebook',
   '{"brand": "Paperly", "price": 12.50, "in_stock": true,
     "tags": ["office", "sale"],
     "specs": {"pages": 240, "color": "black"}}'),
  ('Trail Runner Shoe',
   '{"brand": "Summit", "price": 89.99, "in_stock": false,
     "tags": ["outdoor", "footwear"],
     "specs": {"size": 42, "color": "green", "weight_g": 300}}'),
  ('Desk Lamp',
   '{"brand": "Lumen", "price": 45.00, "in_stock": true,
     "tags": ["office"],
     "specs": {"watts": 9, "color": "white"}}');
