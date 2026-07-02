-- Seed for "04-ranges-and-generated-columns": a tiny booking system. `bookings`
-- stays free of double-bookings via a range column plus a GiST exclusion
-- constraint. `order_lines` shows a STORED generated column deriving line totals
-- from quantity and unit price. Both features are core PostgreSQL 16 — no
-- extensions needed.

CREATE TABLE bookings (
  id     int        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guest  text       NOT NULL,
  during tstzrange  NOT NULL,
  -- No two bookings may overlap in time. The range GiST opclass is built in;
  -- adding a per-room scalar (room_id WITH =) would need the btree_gist
  -- extension, which is out of scope here.
  EXCLUDE USING gist (during WITH &&)
);

INSERT INTO bookings (guest, during) VALUES
  ('Ada',   tstzrange('2026-07-01 14:00+00', '2026-07-03 11:00+00')),
  ('Grace', tstzrange('2026-07-03 14:00+00', '2026-07-05 11:00+00')),
  ('Linus', tstzrange('2026-07-06 14:00+00', '2026-07-08 11:00+00'));

CREATE TABLE order_lines (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product    text NOT NULL,
  qty        int  NOT NULL CHECK (qty > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  -- Always in sync with qty * unit_price; you cannot write to it directly.
  total      numeric(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED
);

INSERT INTO order_lines (product, qty, unit_price) VALUES
  ('Keyboard', 2, 79.00),
  ('Monitor',  1, 249.99),
  ('Cable',    5,  8.50);
