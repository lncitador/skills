# Runbook: CRUD Resource

Use this runbook for the AdonisJS framework side of a CRUD resource: controller, validator, routes, authorization, redirects/responses, transformers, and tests. For migrations, models, relationships, factories, seeders, and query details, load `lucid`.

## Step 1 — Data Contract

If the resource needs a table, model, relationships, factory, or seed data, use `lucid` first.

The AdonisJS side should start only after the data shape is clear enough for validators, controllers, and transformers.

## Step 2 — Validator

Create separate validators for create and update.

```ts
import vine from '@vinejs/vine'

export const createPostValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(255),
  body: vine.string().trim().optional(),
})

export const updatePostValidator = vine.create(
  createPostValidator.schema.clone()
)
```

Keep validation in `app/validators/`, not inline in controllers.

For DB-backed `unique` or `exists` rules, use `lucid` as the data-layer reference.

## Step 3 — Controller

Controllers should parse request state, validate input, authorize, call model/service APIs, and return a response. Move multi-step business logic to a service.

```ts
import type { HttpContext } from '@adonisjs/core/http'
import Post from '#models/post'
import PostPolicy from '#policies/post_policy'
import { createPostValidator, updatePostValidator } from '#validators/post'

export default class PostsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('posts/index')
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createPostValidator)
    await Post.create(payload)
    return response.redirect().toRoute('posts.index')
  }

  async update({ bouncer, params, request, response }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)
    const payload = await request.validateUsing(updatePostValidator)
    await post.merge(payload).save()
    return response.redirect().toRoute('posts.show', { id: post.id })
  }
}
```

If controller queries become complex, move query construction or domain behavior into the data/service layer and use `lucid` for the query/model details.

## Step 4 — Routes

Fixed routes must come before dynamic routes.

```ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'

router.get('/posts/create', [controllers.Posts, 'create']).use(middleware.auth())
router.get('/posts', [controllers.Posts, 'index'])
router.post('/posts', [controllers.Posts, 'store']).use(middleware.auth())
router.get('/posts/:id', [controllers.Posts, 'show'])
router.get('/posts/:id/edit', [controllers.Posts, 'edit']).use(middleware.auth())
router.put('/posts/:id', [controllers.Posts, 'update']).use(middleware.auth())
router.delete('/posts/:id', [controllers.Posts, 'destroy']).use(middleware.auth())
```

## Step 5 — Authorization

Use Bouncer policies for ownership and role checks.

```ts
await bouncer.with(PostPolicy).authorize('edit', post)
```

Use `.authorize()` in controllers and `.allows()` in transformers or places where boolean permission flags are needed.

## Step 6 — Transformers

Use transformers to shape backend data for HTTP/Inertia clients. Transformers should not issue queries. Preload required data before transforming; use `lucid` for preload/query details.

## Step 7 — Tests

Use `japa` for test structure and `lucid` for factories/database state.

Cover:

- Happy path
- Validation failure
- Unauthorized/forbidden access
- Not found behavior
- Redirect/response shape

## Checklist

- [ ] Data-layer work handled with `lucid`
- [ ] Validators are separate files
- [ ] Controller stays thin
- [ ] Routes are ordered fixed-before-dynamic
- [ ] Protected writes use `middleware.auth()`
- [ ] Ownership/role checks use Bouncer
- [ ] Transformers do not query
- [ ] Tests cover success and failure paths
