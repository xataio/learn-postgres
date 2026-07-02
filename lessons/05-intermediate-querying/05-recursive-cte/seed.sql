-- Seed for "05-recursive-cte": an org chart and a tiny directed graph.
-- employees is self-referencing (manager_id points at another employee's id),
-- forming a single tree rooted at the CEO (manager_id IS NULL). It's a few
-- levels deep so recursive walks produce visible depth. edges is a small
-- directed graph with a deliberate cycle (C -> A) to demonstrate cycle safety.

CREATE TABLE employees (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  title      text NOT NULL,
  manager_id int  REFERENCES employees(id)
);

-- Level 0: the CEO has no manager.
-- Level 1: reports to the CEO. Level 2 and 3 fan out below them.
INSERT INTO employees (name, title, manager_id) VALUES
  ('Ada',      'CEO',                NULL),  -- id 1
  ('Grace',    'VP Engineering',        1),  -- id 2
  ('Linus',    'VP Sales',              1),  -- id 3
  ('Margaret', 'Eng Manager',           2),  -- id 4
  ('Dennis',   'Eng Manager',           2),  -- id 5
  ('Katherine','Engineer',              4),  -- id 6
  ('Alan',     'Engineer',              4),  -- id 7
  ('Barbara',  'Engineer',              5),  -- id 8
  ('Edsger',   'Senior Engineer',       6),  -- id 9  (reports to Katherine)
  ('Tom',      'Sales Manager',         3),  -- id 10
  ('Sofia',    'Account Exec',         10),  -- id 11
  ('Omar',     'Account Exec',         10);  -- id 12

-- A directed graph: node -> node. A->B->C and then C->A closes a cycle,
-- so an unguarded recursive walk from A would loop forever.
CREATE TABLE edges (
  src text NOT NULL,
  dst text NOT NULL
);

INSERT INTO edges (src, dst) VALUES
  ('A', 'B'),
  ('B', 'C'),
  ('C', 'A'),   -- cycle back to the start
  ('B', 'D');
