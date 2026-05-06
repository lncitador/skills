# Middleware

## Middleware types

| Type | Location | When it runs |
|---|---|---|
| Router (global) | `start/kernel.ts` → `server.use()` | Every HTTP request |
| Named | `start/kernel.ts` → `router.named()` | Applied explicitly on routes |
| Inline | Directly on the route | Only that route |

## Create middleware

```bash
node ace make:middleware GuestOnly
```

```ts
// app/middleware/guest_only_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class GuestOnlyMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    await auth.check()

    if (auth.isAuthenticated) {
      return response.redirect().toRoute('dashboard')
    }

    return next()  // always call next() to continue
  }
}
```

## Register in start/kernel.ts

```ts
import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

// Global middleware — runs on EVERY request
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

// Named — applied explicitly on routes
export const middleware = router.named({
  auth: () => import('@adonisjs/auth/auth_middleware'),
  guest: () => import('#middleware/guest_only_middleware'),
  role: () => import('#middleware/role_middleware'),
  twoFactor: () => import('#middleware/two_factor_middleware'),
})
```

## Apply to routes

```ts
import { middleware } from '#start/kernel'

// Single route
router.get('/dashboard', handler).use(middleware.auth())

// Multiple middleware
router.get('/admin', handler).use([middleware.auth(), middleware.role({ role: 'admin' })])

// Route group
router.group(() => {
  router.resource('posts', controllers.Posts)
}).use([middleware.auth(), middleware.role({ role: 'admin' })]).prefix('/admin')

// Specific actions on a resource
router
  .resource('posts', controllers.Posts)
  .use(['store', 'update', 'destroy'], middleware.auth())
```

## Middleware with parameters

```ts
// app/middleware/role_middleware.ts
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { role: string }) {
    const user = ctx.auth.getUserOrFail()

    if (user.role !== options.role) {
      return ctx.response.forbidden('Access denied')
    }

    return next()
  }
}

// Usage on route
router.get('/admin', handler).use(middleware.role({ role: 'admin' }))
```

## Middleware that runs after the handler

```ts
export default class LogResponseMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startTime = Date.now()

    await next()  // handler runs here

    const duration = Date.now() - startTime
    logger.info({ url: ctx.request.url(), duration }, 'Request completed')
  }
}
```

## Checklist

- [ ] Always call `next()` unless the middleware intentionally terminates the request
- [ ] Middleware registered in `start/kernel.ts` with lazy imports
- [ ] Named middleware applied on routes — not on the whole server if not global
- [ ] Parameters typed in the `handle(ctx, next, options)` signature
- [ ] Heavy logic goes in a service, not inline in the middleware
