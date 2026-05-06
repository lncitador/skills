# Models

## Two valid model styles in v7

AdonisJS v7 supports two approaches for models. Know which one your project uses.

### Style 1: Schema auto-generation (default starter kit)

Columns are defined in migrations. Running `node ace migration:run` auto-generates
`database/schema.ts`. Model files only contain relationships and business logic.

```ts
// database/schema.ts — AUTO-GENERATED. Never edit manually.
// Regenerated every time you run `node ace migration:run`
export class PostSchema extends BaseModel {
  @column({ isPrimary: true })
  declare id: number
  @column()
  declare title: string
  @column()
  declare userId: number
  // ... all columns auto-generated here
}

// app/models/post.ts — YOUR file. Only relationships + business logic.
import { PostSchema } from '#database/schema'
import { hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Comment from '#models/comment'
import User from '#models/user'

export default class Post extends PostSchema {
  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

### Style 2: Manual column definitions (explicit, older style)

Columns are defined manually in the model file using decorators:

```ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Comment from '#models/comment'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare title: string

  @column({ serializeAs: null })
  declare password: string  // hidden in JSON

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
```

---

## Relation types

```ts
@belongsTo(() => User)      // FK is on this table
declare user: BelongsTo<typeof User>

@hasMany(() => Comment)     // FK is on the other table
declare comments: HasMany<typeof Comment>

@hasOne(() => Profile)
declare profile: HasOne<typeof Profile>

@manyToMany(() => Tag, {
  pivotTable: 'post_tags',
  pivotTimestamps: true,
})
declare tags: ManyToMany<typeof Tag>
```

---

## Common queries

```ts
// Find by PK — throws E_ROW_NOT_FOUND if missing
const post = await Post.findOrFail(id)

// Find by field
const user = await User.findByOrFail('email', email)

// Query builder
const posts = await Post.query()
  .where('userId', user.id)
  .whereNotNull('published_at')
  .preload('user')
  .preload('comments', (q) => q.preload('user').orderBy('createdAt', 'asc'))
  .orderBy('createdAt', 'desc')
  .limit(10)

// Scopes
const posts = await Post.query().withScopes((s) => s.published())

// Pagination
const posts = await Post.query().paginate(page, 15)
// posts.all() → records array
// posts.getMeta() → { total, perPage, currentPage, lastPage, ... }

// Create and update
const post = await Post.create({ title, body, userId: user.id })
await post.merge({ title: 'New title' }).save()

// firstOrFail for filtered queries
const post = await Post.query().where('id', params.id).preload('user').firstOrFail()
```

---

## Hooks

```ts
import { beforeSave, afterCreate } from '@adonisjs/lucid/orm'

@beforeSave()
static async hashPassword(user: User) {
  if (user.$dirty.password) {
    user.password = await hash.make(user.password)
  }
}

@afterCreate()
static async createDefaultSettings(user: User) {
  await UserSettings.create({ userId: user.id })
}
```

---

## Computed properties and scopes

```ts
export default class Post extends PostSchema {
  // Computed — not in DB, calculated at runtime
  get isPublished() {
    return this.publishedAt !== null
  }

  // Scope — reusable query fragment
  static published = scope((query) => {
    query.whereNotNull('published_at')
  })

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
```

---

## Rules

- When using schema auto-generation: model file has ONLY relations, hooks, computed, scopes
- `serializeAs: null` on sensitive columns (password, tokens) hides them from JSON output
- Model does NOT import `HttpContext` or redirect
- Transformers handle serialization — models should not override `serialize()` directly
- Transformers do not issue DB queries — always preload before transforming
