# Transformers

## Overview

Transformers convert backend data (Lucid models, custom classes) into JSON for HTTP clients.
They give you explicit control over serialization — no accidental data leaks, consistent
formatting, and auto-generated TypeScript types for your frontend.

**Important:** Transformers do NOT issue database queries. They only work with data you
have already loaded. Forget to preload a relation and you get a runtime error.

```bash
node ace make:transformer post
node ace make:transformer comment
node ace make:transformer user
```

---

## Base structure

```ts
// app/transformers/post_transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Post from '#models/post'
import UserTransformer from '#transformers/user_transformer'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      // this.pick() selects specific fields — never return this.resource directly
      ...this.pick(this.resource, ['id', 'title', 'url', 'summary', 'createdAt']),
      // Nested transformer for an eager-loaded relation
      author: UserTransformer.transform(this.resource.author),
    }
  }
}
```

---

## Using transformers in controllers

### Inertia apps — pass directly to inertia.render()

```ts
import PostTransformer from '#transformers/post_transformer'

async index({ inertia }: HttpContext) {
  const posts = await Post.query().preload('author').orderBy('createdAt', 'desc')
  return inertia.render('posts/index', {
    posts: PostTransformer.transform(posts),
  })
}

async show({ inertia, params }: HttpContext) {
  const post = await Post.query().where('id', params.id).preload('author').firstOrFail()
  return inertia.render('posts/show', {
    post: PostTransformer.transform(post).useVariant('forDetailedView'),
  })
}
```

### JSON APIs — use serialize() from HttpContext

```ts
async index({ serialize }: HttpContext) {
  const posts = await Post.query().preload('author')
  return serialize(PostTransformer.transform(posts))
}

async show({ serialize, params }: HttpContext) {
  const post = await Post.findOrFail(params.id)
  return serialize(PostTransformer.transform(post))
}
```

---

## Pagination

Use `PostTransformer.paginate()` for paginated results:

```ts
async index({ serialize, request }: HttpContext) {
  const page = request.input('page', 1)
  const posts = await Post.query().paginate(page, 20)

  return serialize(PostTransformer.paginate(posts.all(), posts.getMeta()))
}
```

Response shape:
```json
{
  "data": [{ "id": 1, "title": "..." }],
  "metadata": {
    "total": 100, "perPage": 20, "currentPage": 1,
    "lastPage": 5, "nextPageUrl": "/?page=2", "previousPageUrl": null
  }
}
```

For Inertia, pass paginated data manually:
```ts
return inertia.render('posts/index', {
  posts: {
    data: posts.all().map(p => PostTransformer.transform(p)),
    meta: posts.getMeta(),
  }
})
```

---

## this.whenLoaded() — conditional relations

Use `whenLoaded()` when a relation may or may not be preloaded:

```ts
toObject() {
  return {
    ...this.pick(this.resource, ['id', 'title', 'createdAt']),
    author: UserTransformer.transform(this.resource.author),
    // Only included if comments were preloaded — omitted otherwise
    comments: CommentTransformer.transform(this.whenLoaded(this.resource.comments)),
  }
}
```

This avoids runtime errors when the relation is not loaded. The field is absent from the
output (not null) when the relation was not preloaded.

---

## Variants — different output shapes

Variants define additional output shapes beyond the default `toObject()`:

```ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import type Post from '#models/post'
import PostPolicy from '#policies/post_policy'
import UserTransformer from '#transformers/user_transformer'

export default class PostTransformer extends BaseTransformer<Post> {
  // Default — for list views
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'url', 'summary', 'createdAt']),
      author: UserTransformer.transform(this.resource.author),
      comments: CommentTransformer.transform(this.whenLoaded(this.resource.comments)),
    }
  }

  // Variant — for detail view with authorization flags
  // @inject() resolves HttpContext automatically during serialize/render
  @inject()
  async forDetailedView({ auth, bouncer }: HttpContext) {
    return {
      ...this.toObject(),
      can: {
        // .allows() returns boolean — does NOT throw like .authorize()
        edit: await bouncer.with(PostPolicy).allows('edit', this.resource),
        delete: await bouncer.with(PostPolicy).allows('delete', this.resource),
      },
    }
  }
}
```

Use a variant:
```ts
// In controller
PostTransformer.transform(post).useVariant('forDetailedView')
```

**Why variants for permissions:** Bouncer policies run only on the backend. They cannot
be imported in React. Pre-compute permissions in a variant and send boolean flags to the
frontend. This is the recommended pattern for authorization in Inertia apps.

---

## Controlling relation depth

By default, transformers serialize relationships one level deep. Use `.depth()` to go deeper:

```ts
toObject() {
  return {
    ...this.pick(this.resource, ['id', 'fullName', 'email']),
    posts: PostTransformer.transform(this.resource.posts).depth(2),
    // depth(2) means user → posts → comments are all included
  }
}
```

---

## Custom data in constructor

Pass extra data to a transformer via constructor:

```ts
export default class PostTransformer extends BaseTransformer<Post> {
  constructor(
    resource: Post,
    protected likedPostIds: number[]
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'createdAt']),
      isLiked: this.likedPostIds.includes(this.resource.id),
    }
  }
}

// Usage:
const likedIds = likedPosts.map(p => p.id)
return serialize(PostTransformer.transform(posts, likedIds))
```

---

## TypeScript types — auto-generated

Types are generated in `.adonisjs/client/data.d.ts` when the dev server runs.
Import them in React components via the configured alias:

```tsx
import { Data } from '@generated/data'
import { InertiaProps } from '~/types'

// Default shape (from toObject())
type PageProps = InertiaProps<{
  posts: Data.Post[]
  post: Data.Post
}>

// Variant shape
type DetailPageProps = InertiaProps<{
  post: Data.Post.Variants['forDetailedView']
  // TypeScript knows this includes post.can.edit, post.can.delete
}>
```

Types update automatically when the dev server reloads after transformer changes.

---

## Checklist

- [ ] Use `this.pick()` to select fields explicitly — never return `this.resource` directly
- [ ] Preload all relations the transformer accesses before calling `.transform()`
- [ ] Use `this.whenLoaded()` for relations that are not always preloaded
- [ ] Use variants + `.allows()` for frontend authorization flags
- [ ] Use `Data.Post.Variants['variantName']` for variant-specific prop types
- [ ] `PostTransformer.paginate(posts.all(), posts.getMeta())` for paginated API responses
- [ ] Custom data via constructor — available in all variant methods automatically
- [ ] Transformer does NOT validate request input — that is VineJS's job
