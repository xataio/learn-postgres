-- Seed for "03-full-text-search": a small articles table with title and body
-- text suitable for full-text search demonstrations.

CREATE TABLE articles (
  id           int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text NOT NULL,
  body         text NOT NULL,
  published_at date NOT NULL,
  author       text NOT NULL
);

INSERT INTO articles (title, body, published_at, author) VALUES
  ('Introduction to PostgreSQL',
   'PostgreSQL is a powerful open-source relational database management system. It supports advanced data types, full-text search, and JSON operations. Many companies rely on PostgreSQL for their critical data infrastructure.',
   '2024-01-15', 'Alice'),
  ('Understanding Database Indexes',
   'Indexes are essential for database performance. A B-tree index speeds up equality and range queries. PostgreSQL also supports GIN, GiST, and BRIN index types for specialized workloads like full-text search and geometric data.',
   '2024-02-01', 'Bob'),
  ('Building REST APIs with Node.js',
   'Node.js is a popular runtime for building web services. Combined with Express and a PostgreSQL database, you can build robust REST APIs. Connection pooling and query optimization are important for production deployments.',
   '2024-02-15', 'Alice'),
  ('Data Modeling Best Practices',
   'Good data modeling starts with understanding your access patterns. Normalize to reduce redundancy, but denormalize strategically for read performance. Foreign keys enforce referential integrity across related tables.',
   '2024-03-01', 'Carol'),
  ('Full-Text Search in PostgreSQL',
   'PostgreSQL provides built-in full-text search capabilities without requiring external tools like Elasticsearch. Using tsvector and tsquery, you can build fast, relevant search features directly in your database. Ranking functions help order results by relevance.',
   '2024-03-15', 'Bob'),
  ('Introduction to Window Functions',
   'Window functions perform calculations across rows related to the current row. Unlike aggregate functions with GROUP BY, window functions do not collapse rows. Common window functions include ROW_NUMBER, RANK, and LAG.',
   '2024-04-01', 'Alice'),
  ('Scaling PostgreSQL for Production',
   'Scaling PostgreSQL involves connection pooling, read replicas, and partitioning large tables. Monitoring query performance with pg_stat_statements helps identify bottlenecks. Regular VACUUM and ANALYZE keep the query planner accurate.',
   '2024-04-15', 'Carol'),
  ('JSON and Semi-Structured Data',
   'Modern applications often deal with semi-structured data. PostgreSQL JSONB type provides efficient storage and querying of JSON documents. GIN indexes on JSONB columns accelerate containment queries and key existence checks.',
   '2024-05-01', 'Bob');
