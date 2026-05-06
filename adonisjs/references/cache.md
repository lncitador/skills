# Cache

## Installation

```bash
node ace add @adonisjs/cache
# Choose: redis (production), memory (dev/tests), database
```

## getOrSet — the most common pattern

```ts
import cache from '@adonisjs/cache/services/main'

const posts = await cache.getOrSet({
  key: 'featured_posts',
  ttl: '1 hour',
  factory: () => Post.query().where('featured', true).preload('user').limit(6),
})

// Per user
const dashboard = await cache.getOrSet({
  key: `dashboard:${user.id}`,
  ttl: '5 minutes',
  factory: () => buildDashboardData(user),
})
```

## Full API

```ts
const value = await cache.get('key')
const value = await cache.get('key', 'default')

await cache.set('key', value)
await cache.set('key', value, '30 minutes')

await cache.delete('key')
await cache.deleteMany(['key1', 'key2', 'key3'])
await cache.clear()

const exists = await cache.has('key')

await cache.increment('page_views')
await cache.increment('page_views', 5)
```

## Invalidation after mutation

```ts
// Always invalidate cache when data changes
async store({ request, response }: HttpContext) {
  const post = await Post.create(data)

  await cache.delete('featured_posts')
  await cache.delete(`user_posts:${post.userId}`)

  return response.redirect().toRoute('posts.show', { id: post.id })
}
```

## Tags — invalidate groups

```ts
await cache.set('post:1', postData, { ttl: '1 hour', tags: ['posts', 'user:5'] })
await cache.set('post:2', postData, { ttl: '1 hour', tags: ['posts', 'user:3'] })

await cache.deleteByTag('posts')      // invalidates both
await cache.deleteByTag('user:5')     // invalidates only post:1
```

## Configuration per environment

```ts
// config/cache.ts
default: env.get('CACHE_STORE', 'redis'),

stores: {
  redis: store.redis({ connection: 'main', prefix: 'cache:' }),
  memory: store.memory({ maxSize: 10 * 1024 * 1024 }),  // 10MB
  null: store.null(),   // does not store anything — for tests
}
```

**.env:**
```
CACHE_STORE=redis     # production
CACHE_STORE=memory    # dev without Redis
CACHE_STORE=null      # tests
```

## What to cache

```
Good candidates:
  - Heavy queries that change rarely (settings, categories)
  - Aggregated data (counts, rankings, totals)
  - External API results (exchange rates, geocoding)
  - Featured/homepage data

Bad candidates:
  - Per-user data without the user ID in the cache key
  - Data that changes on every request
  - Sensitive data without additional encryption
```

## Checklist

- [ ] Cache key includes user ID when data is per-user
- [ ] Always invalidate when data changes (create, update, delete)
- [ ] Short TTL for dynamic data, long TTL for static data
- [ ] `CACHE_STORE=null` in tests to avoid state between tests
- [ ] Redis in production — memory only for dev/tests
