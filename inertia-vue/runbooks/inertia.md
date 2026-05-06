# Runbook: Inertia + Vue 3 Setup

**Prerequisites:** `adonisjs` skill installed. AdonisJS starter kit with Inertia + Vue chosen.

**Start dev server:** `node ace serve --hmr`

---

## Step 1 — Starter kit structure

```
inertia/
├── app.vue          # Vue entrypoint
├── ssr.vue          # SSR entrypoint (when enabled)
├── client.ts        # urlFor from ~/client
├── types.ts         # InertiaProps type
├── tsconfig.json
├── css/app.css
├── layouts/
│   └── default.vue
└── pages/           # Page components — mapped to inertia.render() calls
    └── home.vue
```

---

## Step 2 — Creating pages

```bash
node ace make:page posts/index   # creates inertia/pages/posts/index.vue
node ace make:page posts/show
node ace make:page posts/create
node ace make:page posts/edit
```

---

## Step 3 — Page props

```vue
<!-- inertia/pages/posts/index.vue -->
<script setup lang="ts">
import { Data } from '@generated/data'

defineProps<{ posts: Data.Post[] }>()
// posts is fully typed from PostTransformer
</script>

<template>
  <div v-for="post in posts" :key="post.id">
    <h2>{{ post.title }}</h2>
  </div>
</template>
```

For variant shapes:
```vue
<script setup lang="ts">
import { Data } from '@generated/data'

// forDetailedView variant includes post.can.edit, post.can.delete
defineProps<{ post: Data.Post.Variants['forDetailedView'] }>()
</script>
```

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

Access in Vue:
```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import type { SharedProps } from '@adonisjs/inertia/types'

const page = usePage<SharedProps>()
// page.props.user, page.props.flash — typed
</script>

<template>
  <div v-if="page.props.flash.success">{{ page.props.flash.success }}</div>
</template>
```

---

## Step 5 — Forms

```vue
<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
</script>

<template>
  <Form route="posts.store" v-slot="{ errors }">
    <div>
      <label for="title">Title</label>
      <input
        type="text"
        name="title"
        id="title"
        :data-invalid="errors.title ? 'true' : undefined"
      />
      <div v-if="errors.title">{{ errors.title }}</div>
    </div>
    <button type="submit">Create post</button>
  </Form>
</template>
```

Edit form (pre-populated):
```vue
<Form route="posts.update" :routeParams="{ id: post.id }" v-slot="{ errors }">
  <input name="title" type="text" :value="post.title" />
</Form>
```

---

## Step 6 — Navigation

```vue
<script setup>
import { Link } from '@adonisjs/inertia/vue'
import { urlFor } from '~/client'
</script>

<template>
  <Link route="posts.index">All posts</Link>
  <Link route="posts.show" :routeParams="{ id: post.id }">{{ post.title }}</Link>
  <Link route="session.destroy" method="DELETE" as="button">Sign out</Link>
  <!-- Query params — must use urlFor -->
  <Link :href="urlFor('posts.index', [], { qs: { page: 2 } })">Page 2</Link>
</template>
```

---

## Step 7 — Layout with flash messages

```vue
<!-- inertia/layouts/default.vue -->
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import type { SharedProps } from '@adonisjs/inertia/types'

const page = usePage<SharedProps>()
</script>

<template>
  <nav>
    <Link route="posts.index">Posts</Link>
    <template v-if="page.props.user">
      <span>{{ page.props.user.fullName }}</span>
      <Link route="session.destroy" method="DELETE" as="button">Sign out</Link>
    </template>
    <template v-else>
      <Link route="session.create">Sign in</Link>
    </template>
  </nav>

  <div v-if="page.props.flash.success" class="alert-success">
    {{ page.props.flash.success }}
  </div>
  <div v-if="page.props.flash.error" class="alert-error">
    {{ page.props.flash.error }}
  </div>

  <main><slot /></main>
</template>
```

---

## Final checklist

- [ ] Dev server running — `#generated/controllers` and `@generated/data` auto-update
- [ ] Pages in `inertia/pages/` created with `node ace make:page`
- [ ] `Form` and `Link` from `@adonisjs/inertia/vue` — not `@inertiajs/vue3`
- [ ] Props typed with `Data.Post` from `@generated/data`
- [ ] Shared data in `InertiaMiddleware.share()` with `InferSharedProps` augmentation
- [ ] `ctx.inertia.always()` on all shared data
- [ ] Optional chaining on `ctx.session` and `ctx.auth` in `share()`
- [ ] `errorBag` on `<Form>` when multiple forms on the same page
- [ ] `:href="urlFor(...)"` for query parameters — not `route` prop
- [ ] Route ordering: `/posts/create` before `/posts/:id` (backend concern)
