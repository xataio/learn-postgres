-- Seed for "02-arrays": a recipes app with ingredients stored as arrays,
-- and a students table with exam scores as integer arrays.

CREATE TABLE recipes (
  id          int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       text NOT NULL,
  cuisine     text NOT NULL,
  ingredients text[] NOT NULL,
  prep_time   int  NOT NULL  -- minutes
);

INSERT INTO recipes (title, cuisine, ingredients, prep_time) VALUES
  ('Margherita Pizza', 'Italian',
   ARRAY['flour', 'tomato', 'mozzarella', 'basil', 'olive oil'], 45),
  ('Pasta Carbonara', 'Italian',
   ARRAY['pasta', 'egg', 'pecorino', 'guanciale', 'black pepper'], 25),
  ('Tacos al Pastor', 'Mexican',
   ARRAY['pork', 'pineapple', 'onion', 'cilantro', 'tortilla', 'chili'], 60),
  ('Caesar Salad', 'American',
   ARRAY['romaine', 'parmesan', 'croutons', 'egg', 'anchovy', 'olive oil'], 15),
  ('Pad Thai', 'Thai',
   ARRAY['rice noodles', 'shrimp', 'egg', 'peanuts', 'bean sprouts', 'lime', 'fish sauce'], 30),
  ('Guacamole', 'Mexican',
   ARRAY['avocado', 'lime', 'onion', 'cilantro', 'tomato', 'chili'], 10),
  ('Greek Salad', 'Greek',
   ARRAY['tomato', 'cucumber', 'onion', 'feta', 'olive oil', 'oregano'], 10);

CREATE TABLE students (
  id     int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name   text NOT NULL,
  scores int[] NOT NULL  -- exam scores throughout the semester
);

INSERT INTO students (name, scores) VALUES
  ('Alice',   ARRAY[85, 92, 78, 95, 88]),
  ('Bob',     ARRAY[72, 68, 75, 80, 77]),
  ('Carol',   ARRAY[91, 95, 89, 97, 93]),
  ('David',   ARRAY[60, 55, 70, 65, 72]),
  ('Eve',     ARRAY[88, 90, 85, 92, 94]);
