# Migrations

## Fundamental rule

Never edit a migration that has already run in production. Always create a new migration with `ALTER TABLE`.

## CRITICAL: Migrations drive schema generation

In AdonisJS v7, when you run migrations, `database/schema.ts` is automatically regenerated with all column definitions. Your models extend these schema classes — so **define all columns in migrations, never in model files**.

## Base structure — create table

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.string('url').notNullable()
      table.text('summary').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

## Adding foreign keys — separate migration

When adding FKs to existing tables, create a new migration:

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Add user_id to posts table
    this.schema.alterTable('posts', (table) => {
      table.integer('user_id').unsigned().notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
    })

    // Add user_id and post_id to comments table
    this.schema.alterTable('comments', (table) => {
      table.integer('user_id').unsigned().notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')

      table.integer('post_id').unsigned().notNullable()
      table.foreign('post_id').references('posts.id').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable('posts', (table) => {
      table.dropForeign(['user_id'])
      table.dropColumn('user_id')
    })

    this.schema.alterTable('comments', (table) => {
      table.dropForeign(['user_id'])
      table.dropForeign(['post_id'])
      table.dropColumn('user_id')
      table.dropColumn('post_id')
    })
  }
}
```

## Column types — quick reference

```ts
// IDs
table.increments('id')           // INTEGER AUTO_INCREMENT PK
table.uuid('id').primary()       // UUID PK

// Strings
table.string('name')             // VARCHAR(255)
table.string('code', 10)         // VARCHAR(10)
table.text('body')               // TEXT
table.text('content', 'long')    // LONGTEXT

// Numbers
table.integer('count')
table.integer('user_id').unsigned()
table.bigInteger('amount')
table.decimal('price', 10, 2)
table.float('score')

// Booleans
table.boolean('is_active').defaultTo(true)

// Dates
table.timestamp('published_at').nullable()
table.timestamp('created_at')
table.timestamp('updated_at')
table.timestamps(true, true)     // created_at + updated_at with defaults

// JSON
table.json('metadata').nullable()
table.jsonb('settings').nullable()  // PostgreSQL only — better performance

// Enum
table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft')

// FK — two equivalent styles:
// Style 1: inline
table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

// Style 2: separate .foreign() call (shown in official tutorial)
table.integer('user_id').unsigned().notNullable()
table.foreign('user_id').references('users.id').onDelete('CASCADE')
```

## Commands

```bash
node ace migration:run              # run pending migrations (regenerates schema.ts)
node ace migration:rollback         # revert last batch
node ace migration:rollback --batch=0  # revert all (dev only)
node ace migration:status           # see state of each migration
node ace migration:fresh            # drop all + migrate (dev only)
node ace make:migration create_posts_table
node ace make:migration add_foreign_keys_to_posts_and_comments
```

## onDelete — when to use each

| Option | When to use |
|---|---|
| `CASCADE` | Child records make no sense without the parent (comments without post) |
| `SET NULL` | Child records can exist without the parent (order without coupon) |
| `RESTRICT` | Do not allow deleting the parent if it has children (user with active orders) |

## Pivot table (many-to-many)

```ts
async up() {
  this.schema.createTable('post_tags', (table) => {
    table.increments('id')
    table.integer('post_id').unsigned().notNullable()
    table.foreign('post_id').references('posts.id').onDelete('CASCADE')
    table.integer('tag_id').unsigned().notNullable()
    table.foreign('tag_id').references('tags.id').onDelete('CASCADE')
    table.timestamps(true, true)
    table.unique(['post_id', 'tag_id'])
  })
}
```
