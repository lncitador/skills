---
name: inertia-vue
description: >
  Use this skill alongside the adonisjs skill when the project uses Inertia.js with Vue 3 as the frontend layer. Trigger for anything involving Vue page components in an AdonisJS + Inertia project: the Form or Link components from @adonisjs/inertia/vue, typed props with Data.Post from @generated/data, InertiaMiddleware shared data, deferred/optional/always props, error bags, pagination in Vue, or any inertia.render() frontend pattern. This skill covers only the Vue frontend layer — for all AdonisJS backend patterns (controllers, models, validators, migrations, auth, transformers, events) use the adonisjs skill. Both skills should be active together on Inertia + Vue projects.
---

# Inertia + Vue 3 — Frontend Layer

This skill covers the Vue 3 frontend of an AdonisJS + Inertia project.
For backend patterns → use the `adonisjs` skill alongside this one.

---

## Always import from the AdonisJS package

```vue
<script setup>
// CORRECT — AdonisJS wrapper adds route-name support
import { Form, Link } from '@adonisjs/inertia/vue'

// WRONG — raw Inertia, loses route-name integration
import { Form, Link } from '@inertiajs/vue3'
</script>
```

---

## Page component types

Types are auto-generated from Transformers when the dev server runs.
No manual command needed — they update automatically.

```vue
<script setup lang="ts">
import { Data } from '@generated/data'   // @generated/data — NOT ~/generated/data

// Default transformer shape
defineProps<{ posts: Data.Post[] }>()

// Variant shape — e.g. includes post.can.edit from forDetailedView variant
defineProps<{ post: Data.Post.Variants['forDetailedView'] }>()
</script>
```

Access shared data (flash, user, errors) via `usePage`:

```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import type { SharedProps } from '@adonisjs/inertia/types'

const page = usePage<SharedProps>()
// page.props.user, page.props.flash — typed from InertiaMiddleware
</script>
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

declare module '@adonisjs/inertia/types' {
  interface SharedProps extends InferSharedProps<InertiaMiddleware> {}
}
```

---

## Form component

Method and action are inferred from the route name — never pass `method` or `action` props:

```vue
<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
defineProps<{ post: { id: number; title: string } }>()
</script>

<template>
  <!-- POST — inferred from posts.store -->
  <Form route="posts.store" v-slot="{ errors }">
    <input name="title" :data-invalid="errors.title ? 'true' : undefined" />
    <div v-if="errors.title">{{ errors.title }}</div>
    <button type="submit">Create</button>
  </Form>

  <!-- PUT — inferred from posts.update -->
  <Form route="posts.update" :routeParams="{ id: post.id }" v-slot="{ errors }">
    <input name="title" :value="post.title" />
  </Form>

  <!-- Multiple forms — isolate errors with errorBag -->
  <Form route="comments.store" :routeParams="{ id: post.id }" errorBag="newComment" v-slot="{ errors }">
    <!-- errors.newComment.content — scoped to this form only -->
    <textarea name="content" />
  </Form>
</template>
```

---

## Link component

```vue
<script setup>
import { Link } from '@adonisjs/inertia/vue'
import { urlFor } from '~/client'
</script>

<template>
  <!-- Client-side navigation — no full reload -->
  <Link route="posts.index">All posts</Link>

  <!-- With route params -->
  <Link route="posts.show" :routeParams="{ id: post.id }">
    {{ post.title }}
  </Link>

  <!-- DELETE method (e.g. logout) -->
  <Link route="session.destroy" method="DELETE" as="button">Sign out</Link>

  <!-- Query params — use urlFor + :href, NOT route prop -->
  <Link :href="urlFor('posts.index', [], { qs: { page: 2 } })">Page 2</Link>
</template>
```

---

## Data loading (controller-side)

These helpers go in the AdonisJS controller:

```ts
return inertia.render('dashboard', {
  permissions: inertia.always(await Permissions.all()),
  metrics: inertia.defer(async () => computeMetrics()),
  signups: inertia.defer(async () => getSignups(), 'stats'),
  revenue: inertia.defer(async () => getRevenue(), 'stats'),
  report: inertia.optional(async () => buildReport()),
  feed: inertia.defer(() => fetchFeed()).merge(),
})
```

Consuming deferred props in Vue:

```vue
<script setup>
import { Deferred } from '@inertiajs/vue3'
defineProps<{ metrics: any }>()
</script>

<template>
  <Deferred data="metrics">
    <template #fallback><p>Loading...</p></template>
    <MetricsChart :metrics="metrics" />
  </Deferred>
</template>
```

---

## Pagination

```vue
<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { urlFor } from '~/client'
import { Data } from '@generated/data'

defineProps<{
  posts: {
    data: Data.Post[]
    metadata: {
      total: number; perPage: number; currentPage: number
      lastPage: number; firstPage: number
    }
  }
}>()
</script>

<template>
  <article v-for="post in posts.data" :key="post.id">
    {{ post.title }}
  </article>
  <nav>
    <Link
      v-if="posts.metadata.currentPage > 1"
      :href="urlFor('posts.index', [], { qs: { page: posts.metadata.currentPage - 1 } })"
    >Previous</Link>
    <Link
      v-if="posts.metadata.currentPage < posts.metadata.lastPage"
      :href="urlFor('posts.index', [], { qs: { page: posts.metadata.currentPage + 1 } })"
    >Next</Link>
  </nav>
</template>
```

---

## Redirects and history (controller-side)

```ts
// Standard redirect (Inertia upgrades 302 → 303 automatically)
return response.redirect().toRoute('posts.index')

// External redirect (different origin)
return inertia.location('https://checkout.stripe.com/...')

// After logout — clear history
inertia.clearHistory()
return inertia.location('/')

// Sensitive page — encrypt history state
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
| Inertia + Vue setup — pages, forms, shared data, SSR | runbooks/inertia.md |

---

## Anti-Patterns

| Wrong | Correct |
|---|---|
| `import { Form } from '@inertiajs/vue3'` | `import { Form } from '@adonisjs/inertia/vue'` |
| `method` prop on `<Form>` | Method inferred from route name automatically |
| `<a :href="'/posts'">` for internal links | `<Link route="posts.index">` |
| `Data.Post` for variant props | `Data.Post.Variants['forDetailedView']` |
| `import { Data } from '~/generated/data'` | `import { Data } from '@generated/data'` |
| `route` prop on `<Link>` with query string | `:href="urlFor(..., { qs: {} })"` |
| Shared data in `start/inertia.ts` | `InertiaMiddleware.share()` |
| No `always()` on shared data | `ctx.inertia.always()` so it survives partial reloads |
