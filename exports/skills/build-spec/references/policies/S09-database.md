# S09 — Database and migrations

Choose storage for actual access/integrity needs. For relational data use
IDEF1X's logical viewpoint, then provide the physical schema: fields and SQL
types, nullability/defaults, PK/FK/unique/check/exclusion constraints, indexes,
deletion rules, time representation and transaction integrity. Specify migration
order, seed data, backup/restore and compatibility when relevant.

The section contains DDL/ORM contracts or exact existing references. Its ER or
IDEF1X diagram agrees with those keys and cardinalities. A diagram does not supply
SQL types, indexes or concurrent enforcement. For other storage describe its
actual identity, access patterns and consistency model instead of forcing IDEF1X.

Check representative queries and competing writes. See
[data guidance](../../../spec-diagrams/references/idef1x-data.md).
