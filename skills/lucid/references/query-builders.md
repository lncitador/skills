# Query Builders, Pagination, and Debugging

Use this reference for `db` service queries, model query builder behavior, raw SQL, pagination, query inspection, and SQL debugging.

## Choosing `db` vs Model Queries

Use model queries when you need:

- Model instances
- Relationships
- Hooks
- Scopes
- Serialization behavior
- Active Record methods

Use the `db` service when you need:

- Plain rows
- SQL-heavy reports
- Bulk operations
- CTEs, window functions, JSON operations, locks, or raw SQL
- Queries that should not hydrate models

## Database Service

Import the database service from Lucid:

```ts
import db from '@adonisjs/lucid/services/db'
```

Common read:

```ts
const posts = await db
  .from('posts')
  .select('id', 'title', 'created_at')
  .where('status', 'published')
  .orderBy('created_at', 'desc')
```

Insert:

```ts
const [post] = await db
  .table('posts')
  .insert({ title: 'Hello', body: 'World' })
  .returning(['id', 'title'])
```

Update/delete:

```ts
await db.from('posts').where('id', params.id).update({ status: 'published' })
await db.from('posts').where('id', params.id).delete()
```

Always include a `where` clause on update and delete queries unless intentionally updating/deleting the entire table.

## Select Query Builder

The select query builder supports the usual SQL composition APIs: `select`, `where`, `whereIn`, joins, order, group, having, aggregates, CTEs, row locks, JSON helpers, and conditional clauses.

```ts
const rows = await db
  .from('orders')
  .select('customer_id')
  .sum('total as revenue')
  .where('status', 'paid')
  .groupBy('customer_id')
  .orderBy('revenue', 'desc')
```

Use `whereJson`, `whereJsonSuperset`, and `whereJsonSubset` for supported JSON-column filtering.

## Model Query Builder

`Model.query()` returns model instances and adds model-aware methods:

```ts
const posts = await Post
  .query()
  .where('status', 'published')
  .preload('author')
  .withCount('comments')
  .orderBy('createdAt', 'desc')
```

Important methods:

- `preload` and `preloadOnce` for eager loading.
- `withCount` and `withAggregate` for relationship aggregates on `$extras`.
- `has`, `whereHas`, `doesntHave`, and `whereDoesntHave` for relationship filters.
- `withScopes` or `apply` for model scopes.
- `pojo` for plain objects instead of model instances.
- `sideload` for passing contextual values to loaded models and relationships.
- `rowTransformer` for per-row decoration after loading.

## Pagination

Use pagination for list endpoints and UI pages:

```ts
const page = request.input('page', 1)
const posts = await Post.query().orderBy('createdAt', 'desc').paginate(page, 20)
```

Preserve query strings in UI/API responses when filters or sorting are active.

## Raw SQL

Use raw SQL for expressions that query builders cannot express clearly:

```ts
const rows = await db
  .from('scores')
  .select('user_id', 'game_id', 'points')
  .select(db.raw('rank() over (partition by game_id order by points desc) as rank'))
```

Prefer bound parameters for user input. Keep raw fragments small and localized.

## Debugging

Use query inspection before guessing:

```ts
const query = db.from('users').where('id', 1).toSQL()
console.log(query.sql, query.bindings)
```

Use `debug(true)` on a specific query when you need runtime query events without enabling global debug.

Use `timeout(ms, { cancel: true })` for long-running queries when the dialect supports cancellation.

## Deeper Docs

- Database service: https://lucid.adonisjs.com/docs/database-service
- Select query builder: https://lucid.adonisjs.com/docs/select-query-builder
- Insert query builder: https://lucid.adonisjs.com/docs/insert-query-builder
- Update and delete queries: https://lucid.adonisjs.com/docs/update-and-delete-queries
- Raw query builder: https://lucid.adonisjs.com/docs/raw-query-builder
- Pagination: https://lucid.adonisjs.com/docs/pagination
- Debugging: https://lucid.adonisjs.com/docs/debugging
