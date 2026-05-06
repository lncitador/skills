---
name: lucid
description: >
  Use when working with AdonisJS Lucid ORM and SQL layer: database configuration, migrations, schema generation, schema classes, models, CRUD operations, model query builder, query scopes, hooks, serialization, relationships, transactions, pagination, debugging, validation rules, model factories, seeders, or database query builders. Trigger for tasks involving @adonisjs/lucid, database/schema.ts, app/models, database/migrations, database/factories, database/seeders, db service queries, Lucid relationships, or model behavior.
---

# Lucid

Use this skill for the Lucid database layer in AdonisJS applications. Lucid is database-first: migrations change the database, Lucid generates `database/schema.ts`, and models extend generated schema classes while declaring relationships, hooks, scopes, serialization, and domain behavior.

When a task also touches controllers, routes, validators, policies, services, or broader AdonisJS architecture, use `adonisjs` alongside this skill. When writing tests around Lucid behavior, use `japa` alongside this skill.

## Core Rules

- Treat the database as the source of truth.
- Write schema changes in migrations, then run migrations or `schema:generate` to refresh `database/schema.ts`.
- Do not manually edit generated `database/schema.ts`.
- Model files should usually extend generated schema classes and contain relationships, hooks, scopes, serialization overrides, and domain methods.
- Use the `db` service for SQL-heavy queries, reports, one-off scripts, or when model hydration is unnecessary.
- Use model queries when you need Active Record behavior, relationships, hooks, scopes, serialization, or model instances.
- Prefer managed transactions with `db.transaction(async (trx) => ...)` unless the transaction lifetime must cross function boundaries.
- Always scope destructive update/delete queries with `where` clauses.
- Preload relationships instead of querying inside loops.
- Use `withCount`, `withAggregate`, `has`, and `whereHas` for relationship-aware filtering and aggregates.

## Workflow

For feature work that changes persisted data:

1. Identify existing tables, generated schema classes, models, and relationships.
2. Write or update migrations first.
3. Run the migration or note the command required to regenerate `database/schema.ts`.
4. Update models to extend the generated schema class and add Lucid-only behavior.
5. Add or update relationships with explicit keys when conventions do not match.
6. Use query builders, scopes, or factories based on the access pattern.
7. Verify with focused tests or a typecheck command available in the repo.

For existing-database adoption:

1. Configure the connection.
2. Exclude unmanaged tables in `schemaGeneration.excludeTables`.
3. Run `node ace schema:generate`.
4. Create models only for tables the application owns.
5. Handle convention mismatches with schema rules or model-level overrides.

## Choosing the Right API

| Need | Prefer |
| --- | --- |
| Table creation or schema change | Migration with `BaseSchema` |
| Typed model columns | Generated schema class from `database/schema.ts` |
| Domain behavior on rows | Model methods and hooks |
| Relationship loading/filtering | Model query builder |
| Reports or SQL-heavy reads | `db.from`, `db.query`, raw query builder |
| Multi-write consistency | Managed transaction |
| Test data | Model factories |
| Initial/dev data | Database seeders |

## References

Load the relevant local reference before implementing:

- `references/schema-and-models.md` for migrations, schema generation, schema classes, CRUD, scopes, hooks, and serialization.
- `references/query-builders.md` for `db` service queries, model query builder behavior, pagination, raw SQL, and debugging.
- `references/transactions.md` for managed/manual transactions, isolation, savepoints, row locks, model transactions, and relationship writes inside transactions.
- `references/relationships.md` for `belongsTo`, `hasOne`, `hasMany`, `manyToMany`, `hasManyThrough`, preloads, relationship filters, aggregates, and writes.
- `references/testing.md` for test database state, factories, factory relationships, pivot attributes, hooks, and seeders.

Each reference contains the essential working patterns first and links to the deeper official Lucid docs at the end.

## Anti-Patterns

| Avoid | Prefer |
| --- | --- |
| Editing `database/schema.ts` by hand | Migrations, schema rules, or model overrides |
| Declaring every column manually in model files | Extend the generated `*Schema` class |
| Running relationship queries inside loops | `preload`, nested preloads, `withCount`, `withAggregate` |
| Unscoped `update` or `delete` | Always include explicit `where` constraints |
| Manual transactions for simple operations | Managed `db.transaction` callback |
| Mocking Lucid query behavior for integration paths | Use Japa with test DB/factories |
| Using models for every report query | Use the `db` service when plain rows are enough |
