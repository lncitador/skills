# Relationships

Use this reference for declaring, loading, filtering, aggregating, and writing Lucid model relationships.

## Relationship Principles

Relationships live on application models, not generated schema classes. Regenerating `database/schema.ts` will not recreate or delete relationship declarations.

Pass related models as functions to avoid circular import issues:

```ts
@hasMany(() => Post)
declare posts: HasMany<typeof Post>
```

Add explicit decorator options when database conventions do not match Lucid defaults. Explicit keys are easier to review than hidden model-level guesses.

## Choosing the Relationship Type

| Shape | Use |
| --- | --- |
| This model owns the foreign key | `belongsTo` |
| Another model points to this one, at most one row | `hasOne` |
| Another model points to this one, many rows | `hasMany` |
| Two models connect through a pivot table | `manyToMany` |
| Target is reached through an intermediate model | `hasManyThrough` |

## BelongsTo

Use when the current table has the foreign key.

```ts
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { PostsSchema } from '#database/schema'
import User from '#models/user'

export default class Post extends PostsSchema {
  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
```

Useful APIs:

```ts
await Post.query().preload('author')
await Post.query().whereHas('author', (query) => query.where('isActive', true))
await post.related('author').associate(user)
await post.related('author').dissociate()
```

`dissociate` requires a nullable foreign key and never deletes the related row.

## HasOne

Use when another table has a foreign key pointing to this model, and only one related row should exist.

```ts
import { hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'

@hasOne(() => Profile, { foreignKey: 'userId' })
declare profile: HasOne<typeof Profile>
```

Use `preload`, `related('profile').query()`, `related('profile').create()`, and relationship filters the same way as other relationships. Ensure the database enforces uniqueness if the relationship must be one-to-one.

## HasMany

Use when another table points to this model and many rows may exist.

```ts
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

@hasMany(() => Post, { foreignKey: 'userId' })
declare posts: HasMany<typeof Post>
```

Useful APIs:

```ts
await User.query().preload('posts', (query) => {
  query.where('status', 'published').orderBy('publishedAt', 'desc')
})

await user.related('posts').create({ title: 'Hello' })
await user.related('posts').createMany([{ title: 'A' }, { title: 'B' }])
```

For top-N per parent, use the relationship docs pattern instead of slicing after preload.

## ManyToMany

Use for pivot-backed many-to-many relationships.

```ts
import { manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

@manyToMany(() => Skill, {
  pivotTable: 'skill_user',
  pivotForeignKey: 'user_id',
  pivotRelatedForeignKey: 'skill_id',
  pivotColumns: ['proficiency'],
  pivotTimestamps: true,
})
declare skills: ManyToMany<typeof Skill>
```

Common APIs:

```ts
await user.related('skills').attach([skillId])
await user.related('skills').detach([skillId])
await user.related('skills').sync([skillIdA, skillIdB])
await User.query().preload('skills')
```

Use `pivotColumns` when application code needs extra pivot fields. Use `pivotTimestamps` when the pivot table tracks creation/update times.

## HasManyThrough

Use when the current model reaches the target through an intermediate model.

```ts
import { hasManyThrough } from '@adonisjs/lucid/orm'
import type { HasManyThrough } from '@adonisjs/lucid/types/relations'

@hasManyThrough([() => Post, () => User])
declare posts: HasManyThrough<typeof Post>
```

Example: Country has many posts through users.

```text
countries.id -> users.country_id
users.id -> posts.user_id
```

Use this for read/query traversal. If the write path is ambiguous, create through the concrete intermediate model instead.

## Loading and Filtering

Avoid N+1 queries:

```ts
const users = await User.query().preload('posts')
```

Constrain preloads:

```ts
await User.query().preload('posts', (postsQuery) => {
  postsQuery.where('status', 'published')
})
```

Nested preload:

```ts
await User.query().preload('posts', (postsQuery) => {
  postsQuery.preload('comments', (commentsQuery) => {
    commentsQuery.preload('author')
  })
})
```

Filter by relationship:

```ts
await User.query().has('posts')
await User.query().whereHas('posts', (query) => query.where('status', 'published'))
await User.query().doesntHave('posts')
```

Aggregates:

```ts
const users = await User.query().withCount('posts')

const user = await User
  .query()
  .withAggregate('accounts', (query) => query.sum('balance').as('accountsBalance'))
  .firstOrFail()
```

Aggregate values live on `$extras`.

## onQuery

Use `onQuery` for relationship-level default constraints:

```ts
@hasMany(() => Post, {
  onQuery: (query) => query.whereNull('deletedAt'),
})
declare posts: HasMany<typeof Post>
```

Keep `onQuery` constraints obvious and stable. Hidden constraints can surprise callers, so document them in the model when they encode domain rules.

## Deeper Docs

- Relationships overview: https://lucid.adonisjs.com/docs/relationships
- BelongsTo: https://lucid.adonisjs.com/docs/belongs-to
- HasOne: https://lucid.adonisjs.com/docs/has-one
- HasMany: https://lucid.adonisjs.com/docs/has-many
- ManyToMany: https://lucid.adonisjs.com/docs/many-to-many
- HasManyThrough: https://lucid.adonisjs.com/docs/has-many-through
- Model query builder: https://lucid.adonisjs.com/docs/model-query-builder
