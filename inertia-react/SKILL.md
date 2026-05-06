---
name: inertia-react
description: >
  Use this skill alongside the adonisjs skill when the project uses Inertia.js with React as the frontend layer. Trigger for anything involving React page components in an AdonisJS + Inertia project: the Form or Link components from @adonisjs/inertia/react, typed props with Data.Post from @generated/data, InertiaMiddleware shared data, deferred/optional/always props, error bags, pagination in React, or any inertia.render() frontend pattern. This skill covers only the React frontend layer — for all AdonisJS backend patterns (controllers, models, validators, migrations, auth, transformers, events) use the adonisjs skill. Both skills should be active together on Inertia + React projects.
---

# Inertia + React — Frontend Layer

This skill covers the React frontend of an AdonisJS + Inertia project.
For backend patterns → use the `adonisjs` skill alongside this one.

---

## Always import from the AdonisJS package

```tsx
// CORRECT — AdonisJS wrapper adds route-name support
import { Form, Link } from '@adonisjs/inertia/react'

// WRONG — raw Inertia, loses route-name integration
import { Form, Link } from '@inertiajs/react'
```

---

## Page component types

Types are auto-generated from Transformers when the dev server runs.
No manual command needed — they update automatically.

```tsx
import { InertiaProps } from '~/types'
import { Data } from '@generated/data'   // @generated/data — NOT ~/generated/data

// Default transformer shape
type PageProps = InertiaProps<{ posts: Data.Post[] }>

// Variant shape — e.g. includes post.can.edit from forDetailedView variant
type DetailProps = InertiaProps<{ post: Data.Post.Variants['forDetailedView'] }>

export default function PostsIndex({ posts }: PageProps) {
  // Fully typed — autocomplete works for all transformer fields
  // props.user, props.flash also available via InertiaProps (from SharedProps)
}
```

---

## Shared Data — InertiaMiddleware

Lives in `app/middleware/inertia_middleware.ts` (backend), not `start/inertia.ts`:

```ts
// app/middleware/inertia_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import UserTransformer from '#transformers/user_transformer'

export default class InertiaMiddleware {
  share(ctx: HttpContext) {
    // share() runs before all middleware — always use optional chaining
    const { session, auth } = ctx as Partial<HttpContext>
    return {
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

Consume in React:

```tsx
// props.user, props.flash, props.errors are all typed via InertiaProps
export default function Layout({ children, user, flash }: PageProps) {
  return (
    <div>
      {flash.success && <div>{flash.success}</div>}
      {user && <span>Hello, {user.fullName}</span>}
      {children}
    </div>
  )
}
```

---

## Form component

Method and action are inferred from the route name — never pass `method` or `action` props:

```tsx
import { Form } from '@adonisjs/inertia/react'

// POST — inferred from posts.store
<Form route="posts.store">
  {({ errors }) => (
    <>
      <input name="title" data-invalid={errors.title ? 'true' : undefined} />
      {errors.title && <div>{errors.title}</div>}
      <button type="submit">Create</button>
    </>
  )}
</Form>

// PUT — inferred from posts.update
<Form route="posts.update" routeParams={{ id: post.id }}>
  {({ errors }) => (
    <input name="title" defaultValue={post.title} />
  )}
</Form>

// Multiple forms on the same page — isolate errors with errorBag
<Form route="comments.store" routeParams={{ id: post.id }} errorBag="newComment">
  {({ errors }) => (
    // errors.newComment.content — scoped to this form only
    <textarea name="content" />
  )}
</Form>
```

---

## Link component

```tsx
import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'

// Client-side navigation — no full reload
<Link route="posts.index">All posts</Link>

// With route params
<Link route="posts.show" routeParams={{ id: post.id }}>
  {post.title}
</Link>

// DELETE method (e.g. logout)
<Link route="session.destroy" method="DELETE" as="button">Sign out</Link>

// Query params — use urlFor + href, NOT route prop
<Link href={urlFor('posts.index', [], { qs: { page: 2 } })}>Page 2</Link>
```

---

## Data loading (controller-side)

These helpers go in the AdonisJS controller:

```ts
return inertia.render('dashboard', {
  // always() — survives partial reloads (for global data)
  permissions: inertia.always(await Permissions.all()),

  // defer() — loads AFTER initial render (slow but always-needed data)
  metrics: inertia.defer(async () => computeMetrics()),

  // defer() with group — loaded together in one follow-up request
  signups: inertia.defer(async () => getSignups(), 'stats'),
  revenue: inertia.defer(async () => getRevenue(), 'stats'),

  // optional() — only when frontend explicitly requests via partial reload
  report: inertia.optional(async () => buildReport()),

  // merge() — merges with existing data instead of replacing (infinite scroll)
  feed: inertia.defer(() => fetchFeed()).merge(),
})
```

Consuming deferred props in React:

```tsx
import { Deferred } from '@inertiajs/react'

<Deferred data="metrics" fallback={<p>Loading...</p>}>
  <MetricsChart metrics={metrics} />
</Deferred>
```

---

## Pagination

```tsx
import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import { Data } from '@generated/data'
import { InertiaProps } from '~/types'

// Paginated data shape from PostTransformer.paginate()
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

## Redirects and history (controller-side)

```ts
// Standard redirect after mutation (Inertia upgrades 302 → 303 automatically)
return response.redirect().toRoute('posts.index')

// External redirect (different origin) — full browser navigation
return inertia.location('https://checkout.stripe.com/...')

// After logout — clear history so user can't navigate back
inertia.clearHistory()
return inertia.location('/')

// Sensitive page — encrypt browser history state
inertia.encryptHistory()
return inertia.render('account/settings', { user })
```

---

## References

| Topic | File |
|---|---|
| All Inertia patterns — config, SSR, root template | references/inertia.md |

---

## Runbooks

| Feature | File |
|---|---|
| Inertia + React setup — pages, forms, shared data, SSR | runbooks/inertia.md |

---

## Anti-Patterns

| Wrong | Correct |
|---|---|
| `import { Form } from '@inertiajs/react'` | `import { Form } from '@adonisjs/inertia/react'` |
| `method` prop on `<Form>` | Method inferred from route name automatically |
| `<a href="/posts">` for internal links | `<Link route="posts.index">` |
| `Data.Post` for variant props | `Data.Post.Variants['forDetailedView']` |
| `import { Data } from '~/generated/data'` | `import { Data } from '@generated/data'` |
| `route` prop on `<Link>` with query string | `href={urlFor(..., { qs: {} })}` |
| Shared data in `start/inertia.ts` | `InertiaMiddleware.share()` |
| No `always()` on shared data | `ctx.inertia.always()` so it survives partial reloads |
| Direct access on `ctx.auth` in `share()` | `const { auth } = ctx as Partial<HttpContext>` |
