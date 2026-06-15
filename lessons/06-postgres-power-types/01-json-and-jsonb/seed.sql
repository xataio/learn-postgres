-- Seed for "01-json-and-jsonb": a products table with structured metadata in a
-- JSONB column, and an events table for semi-structured analytics data.

CREATE TABLE products (
  id        int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL,
  category  text NOT NULL,
  price     numeric(10,2) NOT NULL,
  attrs     jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO products (name, category, price, attrs) VALUES
  ('Wireless Mouse', 'electronics', 29.99,
   '{"brand": "Logitech", "color": "black", "wireless": true, "dpi": 1600, "tags": ["ergonomic", "compact"]}'),
  ('Mechanical Keyboard', 'electronics', 89.99,
   '{"brand": "Keychron", "color": "silver", "wireless": true, "switches": "brown", "tags": ["mechanical", "bluetooth"]}'),
  ('USB-C Cable', 'electronics', 12.99,
   '{"brand": "Anker", "color": "white", "length_m": 2, "tags": ["charging", "data"]}'),
  ('Standing Desk', 'furniture', 449.00,
   '{"brand": "Uplift", "color": "walnut", "height_range": {"min_cm": 60, "max_cm": 125}, "tags": ["adjustable", "electric"]}'),
  ('Monitor Arm', 'furniture', 89.99,
   '{"brand": "Ergotron", "color": "black", "max_weight_kg": 11.3, "tags": ["vesa", "adjustable"]}'),
  ('Noise-Canceling Headphones', 'electronics', 249.99,
   '{"brand": "Sony", "color": "black", "wireless": true, "battery_hours": 30, "tags": ["anc", "bluetooth", "foldable"]}');

CREATE TABLE events (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO events (event_type, payload, created_at) VALUES
  ('page_view', '{"url": "/products", "user_id": 101, "device": "mobile"}', '2024-03-01 10:00:00+00'),
  ('page_view', '{"url": "/products/1", "user_id": 101, "device": "mobile"}', '2024-03-01 10:01:00+00'),
  ('add_to_cart', '{"product_id": 1, "user_id": 101, "quantity": 1}', '2024-03-01 10:02:00+00'),
  ('purchase', '{"order_id": 5001, "user_id": 101, "items": [{"product_id": 1, "qty": 1}, {"product_id": 3, "qty": 2}], "total": 55.97}', '2024-03-01 10:05:00+00'),
  ('page_view', '{"url": "/", "user_id": 202, "device": "desktop"}', '2024-03-01 11:00:00+00'),
  ('page_view', '{"url": "/products", "user_id": 202, "device": "desktop"}', '2024-03-01 11:01:00+00'),
  ('add_to_cart', '{"product_id": 4, "user_id": 202, "quantity": 1}', '2024-03-01 11:03:00+00');
