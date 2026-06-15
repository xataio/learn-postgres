-- Seed for "05-recursive-cte": an employee org chart plus a simple directed
-- graph. The org chart is a classic parent-child hierarchy; the graph table
-- lets us demonstrate path-finding and cycle detection.

CREATE TABLE org_chart (
  id        int  PRIMARY KEY,
  name      text NOT NULL,
  title     text NOT NULL,
  manager_id int REFERENCES org_chart(id)
);

INSERT INTO org_chart (id, name, title, manager_id) VALUES
  (1, 'Alice',   'CEO',              NULL),
  (2, 'Bob',     'VP Engineering',   1),
  (3, 'Carol',   'VP Sales',         1),
  (4, 'David',   'Tech Lead',        2),
  (5, 'Eve',     'Senior Engineer',  2),
  (6, 'Frank',   'Engineer',         4),
  (7, 'Grace',   'Engineer',         4),
  (8, 'Heidi',   'Junior Engineer',  5),
  (9, 'Ivan',    'Sales Manager',    3),
  (10, 'Judy',   'Account Exec',     9),
  (11, 'Karl',   'Account Exec',     9);

CREATE TABLE edges (
  src  text NOT NULL,
  dst  text NOT NULL,
  cost int  NOT NULL DEFAULT 1,
  PRIMARY KEY (src, dst)
);

INSERT INTO edges (src, dst, cost) VALUES
  ('A', 'B', 1),
  ('A', 'C', 4),
  ('B', 'C', 2),
  ('B', 'D', 5),
  ('C', 'D', 1),
  ('C', 'E', 3),
  ('D', 'E', 2);
