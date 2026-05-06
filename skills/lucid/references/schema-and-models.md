# Schema, Migrations, and Models

Use this reference when changing tables, generated schema classes, model files, hooks, scopes, serialization, or CRUD behavior.

## Mental Model

Lucid is database-first:

```text
migration -> database table -> database/schema.ts -> app/models/*
```

Migrations define real database changes. Lucid introspects the live database and writes typed schema classes to `database/schema.ts`. Application models extend those generated classes and add behavior.

## Migrations

Create and alter tables with `BaseSchema` from `@adonisjs/lucid/schema`.

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.text('body').nullable()
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

Use `this.schema.alterTable` for incremental changes. Prefer explicit, reversible migrations for production data changes. For renames, backfills, and splitting tables, write the exact SQL or builder operations needed; do not rely on generated diffs.

Common commands:

```bash
node ace make:migration posts --create=posts
node ace migration:run
node ace migration:rollback
node ace migration:fresh
node ace schema:generate
```

Lucid regenerates `database/schema.ts` after migration commands that change the schema. Use `--no-schema-generate` only when intentionally skipping that step.

## Schema Generation

Generated schema classes live in `database/schema.ts`. They include columns, primary keys, table names, and TypeScript types inferred from the database.

Rules:

- Commit `database/schema.ts` so typecheck and IDEs work without running migrations first.
- Never edit `database/schema.ts` by hand; generation overwrites it.
- For existing databases, configure the connection, exclude unmanaged tables, then run `node ace schema:generate`.
- Use `schemaGeneration.excludeTables` for framework metadata, audit tables, queue tables, or tables owned by other systems.
- Use schema rules or model-level overrides when the database does not follow Lucid conventions.

Example config shape:

```ts
schemaGeneration: {
  enabled: true,
  outputPath: 'database/schema.ts',
  excludeTables: ['knex_migrations', 'knex_migrations_lock'],
  rulesPaths: ['database/schema_rules.ts'],
}
```

## Models

Models usually extend generated schema classes:

```ts
import { PostsSchema } from '#database/schema'

export default class Post extends PostsSchema {
  publish() {
    this.status = 'published'
    return this.save()
  }
}
```

Put these in model files:

- Relationships
- Query scopes
- Lifecycle hooks
- Serialization overrides
- Domain methods that operate on the row
- Model-level overrides for table/connection/serialization when needed

Avoid redeclaring every column in model files. Declare columns manually only when overriding generated behavior, transforms, serialization, or accessor behavior.

## CRUD

Use model APIs when you need model instances:

```ts
const post = await Post.create({ title: 'Hello', body: 'World' })

const latest = await Post
  .query()
  .where('status', 'published')
  .orderBy('createdAt', 'desc')

const existing = await Post.findOrFail(params.id)
existing.merge({ title: 'Updated' })
await existing.save()
await existing.delete()
```

Use `db` service APIs for plain rows, reports, bulk operations, and SQL-heavy reads.

## Query Scopes

Use scopes for reusable model query fragments.

```ts
import { scope } from '@adonisjs/lucid/orm'
import { PostsSchema } from '#database/schema'

export default class Post extends PostsSchema {
  static published = scope((query) => {
    query.where('status', 'published')
  })
}

const posts = await Post.query().withScopes((scopes) => scopes.published())
```

Scopes keep query policy close to the model and avoid duplicated controller/service filters.

## Hooks

Use hooks for invariants that must run every time a lifecycle event occurs.

```ts
import { beforeSave } from '@adonisjs/lucid/orm'
import { PostsSchema } from '#database/schema'

export default class Post extends PostsSchema {
  @beforeSave()
  static async normalize(post: Post) {
    if (post.$dirty.title) {
      post.slug = post.title.toLowerCase().replaceAll(' ', '-')
    }
  }
}
```

Keep hooks focused. Avoid hiding large workflows in hooks when explicit service/application flow would be clearer.

## Serialization

Use serialization when returning models to HTTP responses, Inertia props, logs, or JSON APIs.

Common needs:

- Hide sensitive fields such as passwords or tokens.
- Rename fields or expose computed values.
- Include relationship data only when preloaded.
- Be careful with `$extras`; aggregate values often live there.

## Deeper Docs

- Migrations: https://lucid.adonisjs.com/docs/migrations
- Schema builder: https://lucid.adonisjs.com/docs/schema-builder
- Table builder: https://lucid.adonisjs.com/docs/table-builder
- Schema generation: https://lucid.adonisjs.com/docs/schema-generation
- Models: https://lucid.adonisjs.com/docs/models
- Schema classes: https://lucid.adonisjs.com/docs/schema-classes
- CRUD operations: https://lucid.adonisjs.com/docs/crud-operations
- Query scopes: https://lucid.adonisjs.com/docs/model-query-scopes
- Hooks: https://lucid.adonisjs.com/docs/model-hooks
- Serializing models: https://lucid.adonisjs.com/docs/serializing-models
