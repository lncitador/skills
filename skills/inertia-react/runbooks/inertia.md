# Runbook: Inertia + React Setup

**Prerequisites:** `adonisjs` skill installed. AdonisJS starter kit with Inertia + React chosen.

**Start dev server:** `node ace serve --hmr`

---

## Step 1 — Starter kit structure

```
inertia/
├── app.tsx          # React entrypoint
├── ssr.tsx          # SSR entrypoint (when enabled)
├── client.ts        # urlFor from ~/client
├── types.ts         # InertiaProps type
├── tsconfig.json
├── css/app.css
├── layouts/
│   └── default.tsx
└── pages/           # Page components — mapped to inertia.render() calls
    └── home.tsx
```

---

## Step 2 — Creating pages

```bash
node ace make:page posts/index   # creates inertia/pages/posts/index.tsx
node ace make:page posts/show
node ace make:page posts/create
node ace make:page posts/edit
```

---

## Step 3 — Page props

```tsx
// inertia/pages/posts/index.tsx
import { InertiaProps } from '~/types'
import { Data } from '@generated/data'

type PageProps = InertiaProps<{ posts: Data.Post[] }>

export default function PostsIndex({ posts }: PageProps) {
  // posts is fully typed from PostTransformer
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

For variant shapes:
```tsx
type DetailProps = InertiaProps<{
  post: Data.Post.Variants['forDetailedView']  // includes post.can.edit, post.can.delete
}>
```

`InertiaProps<T>` merges your props with all shared data (flash, user, errors).

---

## Step 4 — Shared data (InertiaMiddleware)

```ts
// app/middleware/inertia_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import UserTransformer from '#transformers/user_transformer'

export default class InertiaMiddleware {
  share(ctx: HttpContext) {
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

declare module '@adonisjs/inertia/types' {
  interface SharedProps extends InferSharedProps<InertiaMiddleware> {}
}
```

Access in React (typed via `InertiaProps`):
```tsx
// flash, user, errors are typed and available directly in props
export default function PostsIndex({ posts, flash, user }: PageProps) {
  return (
    <div>
      {flash.success && <div>{flash.success}</div>}
      {user && <p>Hello, {user.fullName}</p>}
    </div>
  )
}
```

---

## Step 5 — Forms

```tsx
import { Form } from '@adonisjs/inertia/react'

export default function PostsCreate() {
  return (
    <Form route="posts.store">
      {({ errors }) => (
        <>
          <div>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              name="title"
              id="title"
              data-invalid={errors.title ? 'true' : undefined}
            />
            {errors.title && <div>{errors.title}</div>}
          </div>
          <button type="submit">Create post</button>
        </>
      )}
    </Form>
  )
}
```

Edit form (pre-populated):
```tsx
<Form route="posts.update" routeParams={{ id: post.id }}>
  {({ errors }) => (
    <input name="title" type="text" defaultValue={post.title} />
  )}
</Form>
```

---

## Step 6 — Navigation

```tsx
import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'

<Link route="posts.index">All posts</Link>
<Link route="posts.show" routeParams={{ id: post.id }}>{post.title}</Link>
<Link route="session.destroy" method="DELETE" as="button">Sign out</Link>
{/* Query params — must use urlFor */}
<Link href={urlFor('posts.index', [], { qs: { page: 2 } })}>Page 2</Link>
```

---

## Step 7 — Layout with flash messages

```tsx
// inertia/layouts/default.tsx
import { Link } from '@adonisjs/inertia/react'
import { InertiaProps } from '~/types'

type LayoutProps = InertiaProps<{ children: React.ReactNode }>

export default function DefaultLayout({ children, flash, user }: LayoutProps) {
  return (
    <div>
      <nav>
        <Link route="posts.index">Posts</Link>
        {user ? (
          <>
            <span>{user.fullName}</span>
            <Link route="session.destroy" method="DELETE" as="button">Sign out</Link>
          </>
        ) : (
          <Link route="session.create">Sign in</Link>
        )}
      </nav>

      {flash.success && <div className="alert-success">{flash.success}</div>}
      {flash.error && <div className="alert-error">{flash.error}</div>}

      <main>{children}</main>
    </div>
  )
}
```

---

## Final checklist

- [ ] Dev server running — `#generated/controllers` and `@generated/data` auto-update
- [ ] Pages in `inertia/pages/` created with `node ace make:page`
- [ ] `Form` and `Link` from `@adonisjs/inertia/react` — not `@inertiajs/react`
- [ ] Props typed with `Data.Post` from `@generated/data`
- [ ] Shared data in `InertiaMiddleware.share()` with `InferSharedProps` augmentation
- [ ] `ctx.inertia.always()` on all shared data
- [ ] Optional chaining on `ctx.session` and `ctx.auth` in `share()`
- [ ] `errorBag` on `<Form>` when multiple forms on the same page
- [ ] `href={urlFor(...)}` for query parameters — not `route` prop
- [ ] Route ordering: `/posts/create` before `/posts/:id` (backend concern)
