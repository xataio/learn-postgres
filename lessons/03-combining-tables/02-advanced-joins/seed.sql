-- Seed for "02-advanced-joins": a small org with employees, departments, and
-- projects so we have material for self-joins (manager_id), FULL joins
-- (department with no employees + employee with no department), and three-
-- table chains. A few sizes and colors give CROSS JOIN something to do.

CREATE TABLE departments (
  id   serial PRIMARY KEY,
  name text   NOT NULL UNIQUE
);

INSERT INTO departments (name) VALUES
  ('Engineering'),
  ('Design'),
  ('Sales'),
  ('Operations');   -- intentionally has no employees, for FULL JOIN

CREATE TABLE employees (
  id           serial  PRIMARY KEY,
  full_name    text    NOT NULL,
  department_id int    REFERENCES departments(id),   -- nullable: contractors
  manager_id   int     REFERENCES employees(id),
  hired_at     date    NOT NULL
);

INSERT INTO employees (full_name, department_id, manager_id, hired_at) VALUES
  ('Ada Lovelace',       1,    NULL, '2020-01-10'),   -- 1, no manager (CEO-ish)
  ('Alan Turing',        1,    1,    '2020-03-04'),   -- 2, manager: Ada
  ('Grace Hopper',       1,    1,    '2020-04-12'),   -- 3, manager: Ada
  ('Linus Torvalds',     1,    2,    '2021-02-19'),   -- 4, manager: Alan
  ('Margaret Hamilton',  2,    1,    '2020-06-01'),   -- 5, manager: Ada (design lead)
  ('Barbara Liskov',     2,    5,    '2021-05-15'),   -- 6, manager: Margaret
  ('Dennis Ritchie',     3,    1,    '2021-09-22'),   -- 7, manager: Ada (sales lead)
  ('Ken Thompson',       3,    7,    '2022-01-11'),   -- 8, manager: Dennis
  ('Edsger Dijkstra',    NULL, NULL, '2023-03-03'),   -- 9, contractor, no dept
  ('Donald Knuth',       NULL, NULL, '2023-08-17'),   -- 10, contractor, no dept
  ('Guido van Rossum',   1,    2,    '2024-02-20'),   -- 11, manager: Alan
  ('Bjarne Stroustrup',  2,    5,    '2024-07-09');   -- 12, manager: Margaret

CREATE TABLE shirt_sizes (
  size text PRIMARY KEY
);
INSERT INTO shirt_sizes (size) VALUES ('S'), ('M'), ('L');

CREATE TABLE shirt_colors (
  color text PRIMARY KEY
);
INSERT INTO shirt_colors (color) VALUES ('black'), ('white'), ('navy');
