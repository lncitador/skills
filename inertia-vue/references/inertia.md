# Inertia

## Overview

Inertia bridges AdonisJS and React/Vue. AdonisJS handles routing, auth, DB, validation,
and business logic. React/Vue handles only rendering. No frontend routing, no isomorphic
code, no complex state management.

Import components from the AdonisJS package, NOT from Inertia directly:
```ts
// CORRECT
import { Form, Link } from '@adonisjs/inertia/vue'  // React
import { Form, Link } from '@adonisjs/inertia/vue'    // Vue

// WRONG — missing AdonisJS route-name integration
import { Form, Link } from '@inertiajs/react'
```

---

## Rendering pages

```ts
// In controller
return inertia.render('posts/index', {
  posts: PostTransformer.transform(posts),
})
// Resolves to: inertia/pages/posts/index.tsx
```

Without a controller — render directly from route:
```ts
router.on('/about').renderInertia('about')

router.on('/pricing').renderInertia('marketing/pricing', {
  plans: ['starter', 'pro', 'enterprise'],
})
```

---

## Page component types

Types are generated from transformers into `@generated/data` (not `@generated/data`):

```tsx
// inertia/pages/posts/index.tsx
import { InertiaProps } from '~/types'
import { Data } from '@generated/data'

// Default transformer shape
type PageProps = InertiaProps<{ posts: Data.Post[] }>

// Variant shape
type DetailPageProps = InertiaProps<{
  post: Data.Post.Variants['forDetailedView']
}>

export default function PostsIndex({ posts }: PageProps) {
  // Fully typed — autocomplete works
}
```

`InertiaProps<T>` merges your page-specific props with all shared data types.

---

## Shared data — InertiaMiddleware

Shared data lives in `app/middleware/inertia_middleware.ts`, not in `start/inertia.ts`.
The `share()` method returns data available on every page.

```ts
// app/middleware/inertia_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import UserTransformer from '#transformers/user_transformer'

export default class InertiaMiddleware {
  share(ctx: HttpContext) {
    // share() may run before all middleware (e.g. during 404s)
    // always use optional chaining
    const { session, auth } = ctx as Partial<HttpContext>

    return {
      // always() ensures included even in partial reloads
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error: session?.flashMessages.get('error'),
        success: session?.flashMessages.get('success'),
      }),
      user: ctx.inertia.always(
        auth?.user ? UserTransformer.transform(auth.user) : undefined
      ),
    }
  }
}

// Type augmentation — makes shared data typed in every page component
declare module '@adonisjs/inertia/types' {
  interface SharedProps extends InferSharedProps<InertiaMiddleware> {}
}
```

Access shared data in components:
```tsx
export default function PostsIndex(props: PageProps) {
  // props.user, props.flash, props.errors are all typed from SharedProps
  return <div>{props.user && <p>Welcome, {props.user.fullName}</p>}</div>
}
```

---

## Data loading helpers

All helpers are methods on the `inertia` object from `HttpContext`.

```ts
return inertia.render('dashboard', {
  // always() — included even in partial reloads (good for shared/global data)
  permissions: inertia.always(await Permissions.all()),

  // optional() — only evaluated when frontend explicitly requests it (partial reload)
  // Use for: expensive queries rarely needed
  report: inertia.optional(async () => buildReport()),

  // defer() — loads AFTER initial render, Inertia makes a follow-up request
  // Use for: data always needed but slow to compute
  metrics: inertia.defer(async () => computeMetrics()),

  // defer() with group — loaded together in one follow-up request
  signups: inertia.defer(async () => getSignups(), 'dashboard'),
  revenue: inertia.defer(async () => getRevenue(), 'dashboard'),

  // merge() — merges with existing frontend data (infinite scroll, appending)
  notifications: inertia.merge(await fetchNotifications()),

  // defer + merge — deferred AND merged when it arrives
  feed: inertia.defer(() => getFeed()).merge(),
  feedDeep: inertia.defer(() => getFeed()).deepMerge(),  // deep merge
})
```

**Tip:** `optional` = rarely needed (user may never click that tab). `defer` = always
needed but slow (dashboard charts).

---

## Link component

```tsx
import { Link } from '@adonisjs/inertia/vue'

// Named route — client-side navigation, no full reload
<Link route="posts.index">All posts</Link>

// With route params
<Link route="posts.show" routeParams={{ id: post.id }}>
  {post.title}
</Link>

// Multiple params
<Link route="users.posts.show" routeParams={{ userId: user.id, postId: post.id }}>
  View post
</Link>

// With query parameters — use urlFor for this
import { urlFor } from '~/client'
<Link href={urlFor('posts.index', [], { qs: { page: 2, status: 'published' } })}>
  Page 2
</Link>
```

TypeScript enforces all required `routeParams` at compile time.

---

## Form component

```tsx
import { Form } from '@adonisjs/inertia/vue'

// Method and action are inferred from the route name automatically
// Do NOT pass method or action props
<Form route="posts.store">
  {({ errors }) => (
    <>
      <input name="title" data-invalid={errors.title ? 'true' : undefined} />
      {errors.title && <div>{errors.title}</div>}
      <button type="submit">Create</button>
    </>
  )}
</Form>

// With route params (PUT/PATCH inferred from route definition)
<Form route="posts.update" routeParams={{ id: post.id }}>
  {({ errors }) => (
    <input name="title" defaultValue={post.title} />
  )}
</Form>

// Error bags — isolate errors when multiple forms are on the same page
<Form route="comments.store" errorBag="newComment">
  {({ errors }) => (
    // errors.newComment.body — scoped to this form only
    <textarea name="body" />
  )}
</Form>
```

---

## Redirects and history

```ts
// Standard redirect after mutation — Inertia auto-upgrades 302 to 303
return response.redirect().toRoute('posts.index')

// External redirect — different origin, triggers full browser navigation
return inertia.location('https://checkout.stripe.com/...')

// Clear browser history — use after logout so user can't go back
inertia.clearHistory()
return inertia.location('/')

// Encrypt history state — for sensitive pages (settings, billing)
inertia.encryptHistory()
return inertia.render('account/settings', { user })
```

---

## Pagination with Inertia

```ts
// Controller
async index({ request, inertia }: HttpContext) {
  const page = request.input('page', 1)
  const posts = await Post.query().paginate(page, 10)

  return inertia.render('posts/index', {
    posts: PostTransformer.paginate(posts.all(), posts.getMeta()),
  })
}
```

```tsx
// Component — paginated data has { data, metadata } shape
type PageProps = InertiaProps<{
  posts: {
    data: Data.Post[]
    metadata: {
      total: number; perPage: number; currentPage: number
      lastPage: number; firstPage: number
    }
  }
}>

export default function PostsIndex({ posts }: PageProps) {
  const { data, metadata } = posts
  return (
    <div>
      {data.map(post => <article key={post.id}>{post.title}</article>)}
      <nav>
        {metadata.currentPage > 1 && (
          <Link href={urlFor('posts.index', [], { qs: { page: metadata.currentPage - 1 } })}>
            Previous
          </Link>
        )}
        {metadata.currentPage < metadata.lastPage && (
          <Link href={urlFor('posts.index', [], { qs: { page: metadata.currentPage + 1 } })}>
            Next
          </Link>
        )}
      </nav>
    </div>
  )
}
```

---

## Passing data to root Edge template

Third argument to `inertia.render()` goes to the Edge layout template (for meta tags, titles):

```ts
return inertia.render(
  'posts/show',
  { post: PostTransformer.transform(post) },
  { title: post.title, description: post.summary }  // third arg → Edge template
)
```

```edge
{{-- resources/views/inertia_layout.edge --}}
<head>
  <title>{{ title ?? 'My App' }}</title>
  @if(description)
    <meta name="description" content="{{ description }}">
  @end
  @inertiaHead()
  @vite(['inertia/app.tsx'])
</head>
<body>
  @inertia()
</body>
```

---

## Configuration

```ts
// config/inertia.ts
import { defineConfig } from '@adonisjs/inertia'

export default defineConfig({
  rootView: 'inertia_layout',           // Edge template for HTML shell
  encryptHistory: false,                // encrypt all history state globally
  assetsVersion: process.env.RELEASE_SHA, // pin asset version for deployment

  ssr: {
    enabled: false,
    entrypoint: 'inertia/ssr.tsx',
    pages: ['home', 'marketing/pricing'],  // restrict SSR to subset
  },
})
```

---

## InertiaPages type generation — adonisrc.ts

Enable type-safe `inertia.render()` calls by registering the hook:

```ts
// adonisrc.ts
import { defineConfig } from '@adonisjs/core/app'
import { indexPages } from '@adonisjs/inertia/index_pages'

export default defineConfig({
  hooks: {
    onDevServerStarted: [indexPages({ framework: 'react' })],  // or 'vue3'
    onBuildStarting: [indexPages({ framework: 'react' })],
  },
})
```

This makes `inertia.render('posts/index', ...)` autocomplete the component name and
type-check the props against the component's actual prop types.

---

## Checklist

- [ ] Import `Form` and `Link` from `@adonisjs/inertia/vue` — not `@inertiajs/react`
- [ ] Shared data in `InertiaMiddleware.share()` with `InferSharedProps` augmentation
- [ ] Use `ctx.inertia.always()` for shared data to survive partial reloads
- [ ] `inertia.optional()` for rarely-needed data, `inertia.defer()` for slow-but-always-needed
- [ ] `Form` method inferred from route — never pass `method` prop manually
- [ ] `errorBag` on `Form` when multiple forms are on the same page
- [ ] `urlFor` from `~/client` for query parameters (not `route` prop)
- [ ] `PostTransformer.paginate(posts.all(), posts.getMeta())` for paginated Inertia data
- [ ] `inertia.location()` for external redirects (different origin)
- [ ] `inertia.clearHistory()` before logout redirect
- [ ] `@generated/data` import — NOT `@generated/data`
