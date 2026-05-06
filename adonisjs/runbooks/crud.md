# Runbook: Full CRUD Resource

Implements a complete resource with controller, validator, migration, model, and tests.

**When to use:** Creating a new entity in the system (Post, Product, Invoice, etc.)

**Replace `Post`/`post`/`posts`** with your resource name throughout all files.

---

## Step 1 — Generate base files via Ace

```bash
node ace make:model Post -m              # model + migration
node ace make:controller Post --resource  # controller with 7 methods
node ace make:validator post             # validators
```

---

## Step 2 — Migration

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('title').notNullable()
      table.text('body').notNullable()
      table.string('slug').notNullable().unique()
      table.timestamp('published_at').nullable()
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

```bash
node ace migration:run
```

---

## Step 3 — Model

`app/models/post.ts`:

> **v7:** Column definitions are auto-generated in `database/schema.ts` when migrations run.
> The model file only contains relationships and business logic.

```ts
// database/schema.ts is AUTO-GENERATED — never edit it.
// It will contain: id, userId, title, body, slug, publishedAt, createdAt, updatedAt

// app/models/post.ts — only relations and business logic
import { PostSchema } from '#database/schema'
import { belongsTo, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Post extends PostSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @computed()
  get isPublished() {
    return this.publishedAt !== null
  }
}
```

---

## Step 4 — Validators

`app/validators/post.ts`:

```ts
import vine from '@vinejs/vine'

export const createPostValidator = vine.create(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    body: vine.string().trim().minLength(10),
    publishedAt: vine.date().optional(),
  })
)

export const updatePostValidator = vine.create(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    body: vine.string().trim().minLength(10).optional(),
    publishedAt: vine.date().optional(),
  })
)
```

---

## Step 5 — Service (if logic is needed)

`app/services/post_service.ts`:

```ts
import { inject } from '@adonisjs/core'
import string from '@adonisjs/core/helpers/string'
import Post from '#models/post'
import User from '#models/user'

@inject()
export default class PostService {
  async create(user: User, data: { title: string; body: string; publishedAt?: Date }) {
    const slug = string.slug(data.title, { lower: true })
    return Post.create({ ...data, userId: user.id, slug })
  }

  async update(post: Post, data: Partial<{ title: string; body: string; publishedAt: Date }>) {
    if (data.title) {
      (data as any).slug = string.slug(data.title, { lower: true })
    }
    return post.merge(data).save()
  }
}
```

---

## Step 6 — Controller

`app/controllers/posts_controller.ts`:

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Post from '#models/post'
import PostService from '#services/post_service'
import PostPolicy from '#policies/post_policy'
import { createPostValidator, updatePostValidator } from '#validators/post'

@inject()
export default class PostsController {
  constructor(private postService: PostService) {}

  async index({ inertia, auth }: HttpContext) {
    const posts = await Post.query()
      .where('userId', auth.user!.id)
      .orderBy('created_at', 'desc')
    return inertia.render('posts/index', { posts })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('posts/create')
  }

  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createPostValidator)
    const post = await this.postService.create(auth.user!, data)
    return response.redirect().toRoute('posts.show', { id: post.id })
  }

  async show({ inertia, params, bouncer }: HttpContext) {
    const post = await Post.query().where('id', params.id).preload('user').firstOrFail()
    await bouncer.with(PostPolicy).authorize('view', post)
    return inertia.render('posts/show', { post })
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)
    return inertia.render('posts/edit', { post })
  }

  async update({ request, params, response, bouncer }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)
    const data = await request.validateUsing(updatePostValidator)
    await this.postService.update(post, data)
    return response.redirect().toRoute('posts.show', { id: post.id })
  }

  async destroy({ params, response, bouncer }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await bouncer.with(PostPolicy).authorize('delete', post)
    await post.delete()
    return response.redirect().toRoute('posts.index')
  }
}
```

---

## Step 7 — Routes

`start/routes.ts`:

```ts
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'

router
  .resource('posts', controllers.Posts)
  .use(['create', 'store', 'edit', 'update', 'destroy'], middleware.auth())
```

---

## Step 8 — Tests

```ts
import { test } from '@japa/runner'
import Post from '#models/post'
import UserFactory from '#database/factories/user_factory'

test.group('Posts / CRUD', (group) => {
  group.each.setup(async () => { await db.beginGlobalTransaction() })
  group.each.teardown(async () => { await db.rollbackGlobalTransaction() })

  test('creates post when authenticated', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client
      .post('/posts')
      .loginAs(user)
      .json({ title: 'My first post', body: 'Content of the post right here' })

    response.assertRedirectsTo('/posts')
    const post = await Post.findBy('title', 'My first post')
    assert.isNotNull(post)
    assert.equal(post!.userId, user.id)
  })

  test('cannot edit another user post', async ({ client }) => {
    const owner = await UserFactory.create()
    const other = await UserFactory.create()
    const post = await Post.create({ userId: owner.id, title: 'Owner', body: 'Content here', slug: 'owner' })

    const response = await client
      .put(`/posts/${post.id}`)
      .loginAs(other)
      .json({ title: 'Hacked' })

    response.assertStatus(403)
  })

  test('deletes own post', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const post = await Post.create({ userId: user.id, title: 'Delete me', body: 'Content here', slug: 'delete-me' })

    const response = await client.delete(`/posts/${post.id}`).loginAs(user)
    response.assertRedirectsTo('/posts')
    assert.isNull(await Post.find(post.id))
  })
})
```

---

## Final checklist

- [ ] Migration with FKs and timestamps
- [ ] Model with declared relations
- [ ] Validators in `app/validators/` — never inline
- [ ] Business logic in `PostService`, not in the controller
- [ ] Controller with exactly 7 resourceful methods
- [ ] Authorization with Bouncer before edit/delete
- [ ] Routes with `.use(middleware.auth())` on actions that require login
- [ ] Tests cover creation, access denied, and deletion
