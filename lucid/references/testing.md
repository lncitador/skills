# Testing, Factories, and Seeders

Use this reference for Lucid test database setup, factories, relationship fixture data, seeders, and model-centric test data.

## Testing Database State

Use Japa and AdonisJS test utilities for database setup/cleanup. Choose one cleanup strategy per suite/group:

```ts
group.each.setup(() => testUtils.db().withGlobalTransaction())
```

or:

```ts
group.each.setup(() => testUtils.db().truncate())
```

Use global transactions for speed when the tested code stays on the same connection and does not need committed data. Use truncation when testing flows that need committed rows, separate processes, browser tests, or code that does not work inside a wrapped transaction.

## Factories

Define factories in `database/factories`.

```ts
import User from '#models/user'
import { Factory } from '@adonisjs/lucid/factories'

export const UserFactory = Factory
  .define(User, ({ faker }) => {
    return {
      email: faker.internet.email(),
      password: faker.internet.password(),
    }
  })
  .build()
```

Always provide every required database field unless the database has a default.

## Factory Creation Modes

| Method | Use when |
| --- | --- |
| `create` / `createMany` | Need persisted rows |
| `make` / `makeMany` | Need model instances without DB writes |
| `makeStubbed` / `makeStubbedMany` | Need fake primary keys without DB writes |

Examples:

```ts
const user = await UserFactory.create()
const users = await UserFactory.createMany(3)
const draft = await PostFactory.make()
const stubbed = await UserFactory.makeStubbed()
```

Use `make` for unit tests of model methods/serialization that do not touch the database. Use `create` for integration/functional tests.

## Overrides and States

Use `merge` for one-off attributes:

```ts
const user = await UserFactory.merge({ email: 'admin@example.com' }).create()
```

Use states for reusable variants:

```ts
export const PostFactory = Factory
  .define(Post, ({ faker }) => ({
    title: faker.lorem.sentence(),
    status: 'draft',
  }))
  .state('published', (post) => {
    post.status = 'published'
  })
  .build()

await PostFactory.apply('published').createMany(3)
```

Use `mergeRecursive` when a field must be applied to a parent and all related factories, such as tenant IDs.

## Factory Relationships

Declare factory relationships with `.relation`:

```ts
export const UserFactory = Factory
  .define(User, ({ faker }) => ({
    email: faker.internet.email(),
  }))
  .relation('posts', () => PostFactory)
  .build()
```

Create related rows with `.with`:

```ts
const user = await UserFactory.with('posts', 3).create()
```

Configure related factories:

```ts
const user = await UserFactory
  .with('posts', 3, (post) => post.apply('published'))
  .create()
```

Nested relationships:

```ts
const user = await UserFactory
  .with('posts', 2, (post) => post.with('comments', 5))
  .create()
```

Lucid wraps parent and related writes in a transaction.

## Pivot Attributes

For many-to-many factories, use `pivotAttributes`:

```ts
await UserFactory
  .with('teams', 1, (team) => {
    team.pivotAttributes({ role: 'admin' })
  })
  .create()
```

Use an array when creating multiple related rows with different pivot values.

## Factory Hooks

Use factory hooks for test-data concerns that belong to fixture creation:

```ts
Factory
  .define(Post, () => ({ title: 'Hello' }))
  .before('create', async (_factory, post) => {
    post.slug = post.title.toLowerCase()
  })
  .after('create', async (_factory, post) => {
    // create side fixtures if needed
  })
  .build()
```

Avoid hiding application behavior in factories. Factories create data; models/services own business rules.

## Seeders

Use seeders for development/demo/bootstrap data, not for test-specific arrangements.

```bash
node ace make:seeder User
node ace db:seed
```

Prefer factories inside seeders when generating realistic data:

```ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { UserFactory } from '#database/factories/user_factory'

export default class extends BaseSeeder {
  async run() {
    await UserFactory.with('posts', 3).createMany(10)
  }
}
```

Keep production-critical data migrations in migrations or explicit scripts, not casual seeders.

## Deeper Docs

- Testing utilities: https://lucid.adonisjs.com/docs/testing
- Model factories: https://lucid.adonisjs.com/docs/model-factories
- Database seeders: https://lucid.adonisjs.com/docs/seeders
