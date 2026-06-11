-- Seed for "03-window-functions": a small company directory. employees holds
-- a dozen people across three departments, with a deliberate salary tie inside
-- each department so ROW_NUMBER, RANK, and DENSE_RANK produce visibly
-- different results.

CREATE TABLE employees (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  department text NOT NULL,
  salary     int  NOT NULL CHECK (salary > 0)
);

INSERT INTO employees (name, department, salary) VALUES
  ('Ada',      'engineering', 120000),
  ('Grace',    'engineering', 120000),
  ('Linus',    'engineering', 105000),
  ('Margaret', 'engineering',  98000),
  ('Elena',    'sales',        95000),
  ('Marcus',   'sales',        88000),
  ('Priya',    'sales',        88000),
  ('Tom',      'sales',        76000),
  ('Nadia',    'support',      70000),
  ('Omar',     'support',      64000),
  ('Lee',      'support',      64000),
  ('Sofia',    'support',      58000);
