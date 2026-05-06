# Workflow: Code Review

Checklist for reviewing AdonisJS code — detect architecture, security, and convention issues before merging.

**When to use:** When the user wants a review of a code snippet, PR, or wants you to validate if an implementation is correct.

---

## How to do the review

When receiving code to review, go through each section below and raise the issues found. Always explain **why** it is a problem, not just what.

---

## 1. Controllers — what should NOT be here

```ts
// Common controller problems
export default class OrdersController {
  async store({ request, response }: HttpContext) {
    const data = request.body()

    // No VineJS validation
    // Inline validation instead of separate file
    if (!data.email || !data.name) {
      return response.badRequest('Missing fields')
    }

    // Business logic in the controller
    const order = new Order()
    order.total = data.items.reduce((sum, item) => sum + item.price, 0)
    order.discount = order.total > 100 ? 0.1 * order.total : 0
    await order.save()

    // Side effect (email) in the controller
    await mail.send(...)

    // Multiple responsibilities
    await updateInventory(data.items)
    await notifyWarehouse(order)

    return order
  }
}
```

**Flag:**
- Inline validation → move to `app/validators/`
- Business logic → move to `app/services/`
- Side effects → move to events + listeners
- Controller with more than 7 methods → split into focused controllers

---

## 2. Imports — verify correct sub-paths

```ts
// WRONG — most common mistakes
import { HttpContext } from '@adonisjs/core'
import { BaseModel } from '@adonisjs/core'
import { column } from '@adonisjs/lucid'

// CORRECT
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import router from '@adonisjs/core/services/router'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'
```

---

## 3. Security — critical checklist

```ts
// Write route without auth
router.post('/posts', [controllers.Posts, 'store'])
// Fixed:
router.post('/posts', [controllers.Posts, 'store']).use(middleware.auth())

// ---

// No ownership check — any logged-in user can edit any post
async update({ params, request }: HttpContext) {
  const post = await Post.findOrFail(params.id)
  await post.merge(data).save()
}
// Fixed:
async update({ params, request, bouncer }: HttpContext) {
  const post = await Post.findOrFail(params.id)
  await bouncer.with(PostPolicy).authorize('edit', post)  // throws 403 if denied
  await post.merge(data).save()
}

// ---

// Mass assignment attack — accepting all data without validation
const data = request.all()
await User.create(data)
// Fixed:
const data = await request.validateUsing(createUserValidator)
await User.create(data)
```

---

## 4. Database — queries and N+1

```ts
// N+1 query
const posts = await Post.all()
for (const post of posts) {
  const user = await post.related('user').query().first()  // 1 query per post!
}
// Fixed:
const posts = await Post.query().preload('user')

// ---

// SELECT * when only a few fields are needed
const users = await User.all()  // loads password, tokens, etc.
// Fixed:
const users = await User.query().select('id', 'full_name', 'email')

// ---

// FK without onDelete
table.integer('user_id').references('id').inTable('users')
// Fixed:
table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
```

---

## 5. Model — common issues

```ts
// Exposing sensitive columns in serialization
export default class User extends BaseModel {
  @column()
  declare password: string  // exposed in toJSON()!

  @column()
  declare emailVerificationToken: string  // same
}
// Fixed:
@column({ serializeAs: null })
declare password: string

@column({ serializeAs: null })
declare emailVerificationToken: string

// ---

// HTTP logic in model
export default class Post extends BaseModel {
  async publish(ctx: HttpContext) {  // model does not know HttpContext
    ctx.session.flash('success', 'Published!')
  }
}
// Fixed — pure domain logic in model:
export default class Post extends BaseModel {
  get isPublished() {
    return this.publishedAt !== null
  }

  async publish() {
    this.publishedAt = DateTime.now()
    await this.save()
  }
}
```

---

## 6. Validators — conventions

```ts
// No trim on strings
export const createPostValidator = vine.create(
  vine.object({
    title: vine.string(),   // accepts "  title with spaces  "
    email: vine.string(),   // accepts "EMAIL@EXAMPLE.COM"
  })
)
// Fixed:
export const createPostValidator = vine.create(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    email: vine.string().email().normalizeEmail(),
  })
)

// ---

// One giant validator for create and update
// Fixed — separate validators:
export const createPostValidator = vine.create(
  vine.object({ title: vine.string().trim() })
)

export const updatePostValidator = vine.create(
  vine.object({ title: vine.string().trim().optional() })
)
```

---

## 7. Routes — organization

```ts
// Scattered routes without organization
router.get('/posts', ...)
router.post('/posts', ...)
router.get('/admin/posts', ...)
router.put('/posts/:id', ...)

// Fixed — grouped and resourceful:
router.resource('posts', controllers.Posts)
  .use(['store', 'update', 'destroy'], middleware.auth())

router.group(() => {
  router.resource('posts', controllers.AdminPosts)
  router.resource('users', controllers.AdminUsers)
}).prefix('/admin').use([middleware.auth(), middleware.role({ role: 'admin' })])

// ---

// Routes without names
router.get('/posts/:id/edit', [controllers.Posts, 'edit'])
// Fixed — resource already names them automatically: posts.edit
// For custom routes:
router.get('/dashboard', [controllers.Dashboard, 'index']).as('dashboard')
```

---

## 8. Tests — quality

```ts
// Test that does not test anything meaningful
test('creates post', async ({ client }) => {
  const response = await client.post('/posts').json({ title: 'Test' })
  response.assertStatus(200)  // only checks status, not the effect
})

// Fixed — test verifies the actual effect:
test('creates post and persists in DB', async ({ client, assert }) => {
  const user = await UserFactory.create()

  const response = await client
    .post('/posts')
    .loginAs(user)
    .json({ title: 'My Post', body: 'Content with more than 10 chars' })

  response.assertRedirectsTo('/posts')

  const post = await Post.findBy('title', 'My Post')
  assert.isNotNull(post)
  assert.equal(post!.userId, user.id)
})

// ---

// No state reset between tests
test.group('Posts', () => {
  test('creates post', ...)
  test('lists posts', ...)  // may see the post from the previous test!
})

// Fixed:
test.group('Posts', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })
  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
```

---

## Feedback format

When doing a review, structure it like this:

```
## Critical issues (block the merge)
- [file:line] Description — Why it is a problem — How to fix it

## Moderate issues (should be fixed)
- ...

## Suggestions (optional improvements)
- ...

## Positives
- What is well done
```

If the code is correct, say so clearly instead of inventing problems.
