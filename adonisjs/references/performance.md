# Performance

## N+1 — the most common issue

```ts
// N+1: 1 query for posts + 1 per post for the user
const posts = await Post.all()
// in template: post.user.name → fires 1 query per post

// Eager loading: 2 queries total
const posts = await Post.query().preload('user')

// Nested preload
const posts = await Post.query()
  .preload('user')
  .preload('comments', (q) => q.preload('user').limit(3))
  .preload('tags')

// Conditional preload
const posts = await Post.query()
  .if(request.input('withComments'), (q) => q.preload('comments'))
```

## Enable query logging to detect N+1

```bash
# .env
DB_DEBUG=true
```

Watch the terminal — repeated queries with different IDs = N+1.

## Select only what you need

```ts
// SELECT * — loads password, tokens, unnecessary data
const users = await User.all()

// Specific SELECT
const users = await User.query().select('id', 'full_name', 'email', 'avatar_path')
// For API serialization — Transformers handle this automatically
```

## Pagination — never fetch everything

```ts
// Bad: fetches all records
const posts = await Post.all()

// Good: always paginate
const page = request.input('page', 1)
const posts = await Post.query()
  .orderBy('created_at', 'desc')
  .paginate(page, 20)

return inertia.render('posts/index', {
  posts: {
    data: posts.all(),
    meta: posts.getMeta(),
  }
})
```

## Indexes — where to add them

```ts
// In migration — index columns used in WHERE and ORDER BY
table.index('slug')
table.index('user_id')
table.index(['status', 'published_at'])
table.unique(['user_id', 'post_id'])
```

**Rule:** if you have `where('column', ...)` or `orderBy('column')` on frequent queries, the column needs an index.

## Cache for repeated heavy queries

```ts
import cache from '@adonisjs/cache/services/main'

const posts = await cache.getOrSet({
  key: 'featured_posts',
  ttl: '1 hour',
  factory: () => Post.query().where('featured', true).preload('user').limit(6),
})

// Invalidate after mutation
await Post.create(data)
await cache.delete('featured_posts')
```

## Heavy operations — move to queue

```ts
// Bad: generating PDF in the controller blocks the request
async generateReport({ response }: HttpContext) {
  const pdf = await generateHeavyPDF(data) // may take 10s
  return response.download(pdf)
}

// Good: dispatch a job and notify the user when done
async generateReport({ auth, response }: HttpContext) {
  await queue.dispatch('generate-report', { userId: auth.user!.id })
  return response.redirect().back()
}
```

## Deferred props (Inertia)

For heavy data that does not need to be in the initial page load:

```ts
async show({ inertia, params }: HttpContext) {
  const post = await Post.findOrFail(params.id)  // fast — sent immediately

  return inertia.render('posts/show', {
    post,
    comments: inertia.defer(() =>            // slow — loaded after
      Comment.query().where('postId', post.id).preload('user')
    ),
  })
}
```

## Checklist

- [ ] Relations loaded with `preload()` — never access a relation without preloading in a loop
- [ ] `select()` on queries that return data to the client
- [ ] Pagination on all list endpoints — never `Model.all()` in production
- [ ] Indexes on filter and sort columns
- [ ] Heavy operations dispatched to queue, not run inline
- [ ] Cache for frequent data that changes rarely
- [ ] Deferred props for secondary data in Inertia
