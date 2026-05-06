# Performance

# Performance

Use this reference for AdonisJS request/application performance. For N+1 queries, pagination, indexes, SQL logging, query plans, and database-level optimization, use the `lucid` skill.

## Cache for repeated heavy queries

```ts
import cache from '@adonisjs/cache/services/main'

const posts = await cache.getOrSet({
  key: 'featured_posts',
  ttl: '1 hour',
  factory: () => buildFeaturedPosts(),
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

For heavy secondary data that does not need to be in the initial page load, use the appropriate Inertia skill.

## Checklist

- [ ] Database/query performance reviewed with `lucid` when relevant
- [ ] Heavy operations dispatched to queue, not run inline
- [ ] Cache for frequent data that changes rarely
- [ ] Deferred props for secondary data in Inertia
