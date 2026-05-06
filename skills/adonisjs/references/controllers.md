# Controllers

## The 7 resourceful methods — never more

```
index   → GET  /posts          list all
create  → GET  /posts/create   creation form
store   → POST /posts          save new
show    → GET  /posts/:id      show one
edit    → GET  /posts/:id/edit edit form
update  → PUT  /posts/:id      save edit
destroy → DELETE /posts/:id    delete
```

If you need an 8th method → create a new focused controller.

## Resource vs Action controller

```ts
// Resource: manages an entity (7 CRUD methods)
router.resource('posts', controllers.Posts)
// or manually:
router.get('/posts', [controllers.Posts, 'index'])
router.get('/posts/:id', [controllers.Posts, 'show'])

// Action: performs a specific action (usually just store)
// app/controllers/publish_post_controller.ts
export default class PublishPostController {
  async store({ params, bouncer, response }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await bouncer.with(PostPolicy).authorize('publish', post)
    await post.merge({ publishedAt: DateTime.now() }).save()
    return response.redirect().toRoute('posts.show', { id: post.id })
  }
}
router.post('/posts/:id/publish', [controllers.PublishPost, 'store']).use(middleware.auth())
```

## Correct controller structure

```ts
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'
import PostPolicy from '#policies/post_policy'
import { createPostValidator, updatePostValidator } from '#validators/post'
import postsService from '#services/posts_service'

export default class PostsController {
  async index({ inertia }: HttpContext) {
    const posts = await postsService.listForIndex()

    return inertia.render('posts/index', {
      posts: PostTransformer.transform(posts),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('posts/create', {})
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createPostValidator)

    await postsService.create(auth.user!, payload)

    return response.redirect().toRoute('posts.index')
  }

  async show({ inertia, params }: HttpContext) {
    const post = await postsService.findDetailed(params.id)

    return inertia.render('posts/show', {
      post: PostTransformer.transform(post).useVariant('forDetailedView'),
    })
  }

  async edit({ bouncer, params, inertia }: HttpContext) {
    const post = await postsService.findForUpdate(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)

    return inertia.render('posts/edit', {
      post: PostTransformer.transform(post),
    })
  }

  async update({ bouncer, params, request, response, session }: HttpContext) {
    const post = await postsService.findForUpdate(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)  // check again — direct PUT possible

    const data = await request.validateUsing(updatePostValidator)
    await postsService.update(post, data)

    session.flash('success', 'Post updated successfully')
    return response.redirect().toRoute('posts.show', { id: post.id })
  }

  async destroy({ bouncer, params, response }: HttpContext) {
    const post = await postsService.findForDelete(params.id)
    await bouncer.with(PostPolicy).authorize('delete', post)
    await postsService.delete(post)
    return response.redirect().toRoute('posts.index')
  }
}
```

## Route ordering — CRITICAL

Routes with fixed segments must be declared **before** routes with dynamic parameters:

```ts
// CORRECT ORDER
router.get('/posts/create', ...)   // fixed segment first
router.get('/posts/:id', ...)      // dynamic param after

// WRONG ORDER — 'create' would be captured as :id
router.get('/posts/:id', ...)
router.get('/posts/create', ...)
```

## Generated controllers barrel

The `#generated/controllers` import is auto-generated from your controller files. The dev server must be running when you create new controllers to pick them up:

```ts
import { controllers } from '#generated/controllers'

router.get('/posts', [controllers.Posts, 'index'])
// Auto-generates route name: posts.index
// controllers.Posts maps to app/controllers/posts_controller.ts
```

## Route naming — automatic

When you define routes with the controllers barrel, names are auto-generated:
- `[controllers.Posts, 'index']` → `posts.index`
- `[controllers.Posts, 'show']` → `posts.show`
- `[controllers.Comments, 'store']` → `comments.store`

Use these names in `<Link route="posts.show">` and `response.redirect().toRoute('posts.show', { id })`.

## Return values

```ts
// Inertia — render a React component with props
return inertia.render('posts/index', { posts: PostTransformer.transform(posts) })

// Redirect
return response.redirect().toRoute('posts.index')
return response.redirect().toRoute('posts.show', { id: post.id })
return response.redirect().back()

// JSON (API only)
return response.ok(PostTransformer.transform(posts))

// No content (DELETE)
return response.noContent()
```

## What the controller DOES and DOES NOT do

| Does | Does NOT do |
|---|---|
| Parse the request | Business logic beyond orchestration |
| Validate with `validateUsing()` | Side effects (email, queue) — use Events |
| Authorize with Bouncer | Complex queries without model |
| Call transformer | Import HttpContext into services |
| Return response / redirect | Contain permission logic — use Policies |
