# Workflow: Exception Handling

How to handle errors globally, create custom exceptions, and configure error responses by type.

**When to use:** Customizing 404/500 errors, creating domain exceptions, configuring different error responses for API vs web.

---

## Global Handler

`app/exceptions/handler.ts` — central point for all HTTP errors:

```ts
import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as lucidErrors } from '@adonisjs/lucid'
import { errors as authErrors } from '@adonisjs/auth'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  // Errors that should NOT be logged (expected, not bugs)
  protected ignoreExceptions = [
    lucidErrors.E_ROW_NOT_FOUND,
    authErrors.E_INVALID_CREDENTIALS,
  ]

  async handle(error: unknown, ctx: HttpContext) {
    // Not found — Lucid
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      return this.#respondNotFound(ctx)
    }

    // Invalid credentials
    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      return this.#respondUnauthorized(ctx)
    }

    // Custom domain exceptions
    if (error instanceof DomainException) {
      return ctx.response.status(error.status).json({
        message: error.message,
        code: error.code,
      })
    }

    // Default behavior (validation, etc.)
    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    if (this.shouldIgnoreException(error)) return
    // Sentry.captureException(error)
    return super.report(error, ctx)
  }

  // Adapted response: JSON for API, redirect for web
  #respondNotFound(ctx: HttpContext) {
    if (ctx.request.accepts(['json', 'html']) === 'json') {
      return ctx.response.status(404).json({ message: 'Resource not found' })
    }
    return ctx.inertia.render('errors/not_found')
  }

  #respondUnauthorized(ctx: HttpContext) {
    if (ctx.request.accepts(['json', 'html']) === 'json') {
      return ctx.response.status(401).json({ message: 'Invalid credentials' })
    }
    ctx.session.flash('error', 'Invalid email or password')
    return ctx.response.redirect().back()
  }
}
```

---

## Custom Domain Exceptions

Create exceptions for errors that are part of the business domain:

```bash
node ace make:exception DomainException
node ace make:exception InsufficientBalanceException
node ace make:exception ResourceLockedException
```

```ts
// app/exceptions/domain_exception.ts
import { Exception } from '@adonisjs/core/exceptions'

export default class DomainException extends Exception {
  static status = 422
  static code = 'E_DOMAIN_ERROR'

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message, {
      status: options?.status ?? DomainException.status,
      code: options?.code ?? DomainException.code,
    })
  }
}

// Specific exceptions
export default class InsufficientBalanceException extends DomainException {
  constructor(available: number, required: number) {
    super(`Insufficient balance. Available: $${available}, required: $${required}`, {
      code: 'E_INSUFFICIENT_BALANCE',
      status: 422,
    })
  }
}

// In service:
if (user.balance < order.total) {
  throw new InsufficientBalanceException(user.balance, order.total)
}
```

---

## Self-handling Exceptions

For exceptions that know exactly how to respond:

```ts
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export default class SubscriptionRequiredException extends Exception {
  static status = 402
  static code = 'E_SUBSCRIPTION_REQUIRED'

  // This method takes precedence over the global handler
  async handle(error: this, ctx: HttpContext) {
    if (ctx.request.accepts(['json', 'html']) === 'json') {
      return ctx.response.status(402).json({
        message: error.message,
        code: error.code,
        upgradeUrl: '/pricing',
      })
    }

    ctx.session.flash('error', 'This feature requires a Pro plan.')
    return ctx.response.redirect('/pricing')
  }
}
```

---

## Status Pages for production

```ts
protected renderStatusPages = app.inProduction

protected statusPages = {
  '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
  '403': (error, { inertia }) => inertia.render('errors/forbidden', { error }),
  '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
}
```

For Edge (without Inertia):
```ts
'404': (error, { view }) => view.render('pages/errors/not_found', { error }),
```

---

## Differentiating API vs web responses in the handler

```ts
async handle(error: unknown, ctx: HttpContext) {
  const isApiRequest = ctx.request.url().startsWith('/api/') ||
    ctx.request.accepts(['json', 'html']) === 'json'

  if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
    if (isApiRequest) {
      return ctx.response.status(404).json({ error: { message: 'Not found', code: 'E_NOT_FOUND' } })
    }
    return ctx.inertia.render('errors/not_found')
  }

  return super.handle(error, ctx)
}
```

---

## Integrating with Sentry

```ts
async report(error: unknown, ctx: HttpContext) {
  if (!this.shouldIgnoreException(error)) {
    Sentry.withScope((scope) => {
      scope.setUser({ id: ctx.auth.user?.id })
      scope.setExtra('url', ctx.request.url())
      Sentry.captureException(error)
    })
  }
  return super.report(error, ctx)
}
```

---

## Checklist

- [ ] Domain exceptions extend `DomainException` (never throw generic `new Error()`)
- [ ] Expected errors (404, invalid credentials) in `ignoreExceptions` to avoid polluting logs
- [ ] Handler distinguishes JSON vs HTML for projects with both API and web routes
- [ ] Self-handling exceptions use `handle()` in the exception file itself
- [ ] Status pages configured for production (404, 500)
- [ ] Sentry/Datadog receives the `user.id` in scope to correlate errors
- [ ] VineJS validation errors need no special handling — they become 422 automatically
