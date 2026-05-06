# Exceptions

## Global handler — app/exceptions/handler.ts

```ts
import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as lucidErrors } from '@adonisjs/lucid'
import { errors as authErrors } from '@adonisjs/auth'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  // Expected errors — do not log (not bugs)
  protected ignoreExceptions = [
    lucidErrors.E_ROW_NOT_FOUND,
    authErrors.E_INVALID_CREDENTIALS,
  ]

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      if (ctx.request.accepts(['json']) === 'json') {
        return ctx.response.status(404).json({ message: 'Resource not found' })
      }
      return ctx.inertia.render('errors/not_found')
    }

    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      ctx.session.flash('error', 'Invalid email or password')
      return ctx.response.redirect().back()
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    if (this.shouldIgnoreException(error)) return
    // Sentry.captureException(error)
    return super.report(error, ctx)
  }
}
```

## Custom domain exception

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

// Specialization
// app/exceptions/insufficient_balance_exception.ts
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

## Self-handling exception

```ts
export default class SubscriptionRequiredException extends Exception {
  static status = 402
  static code = 'E_SUBSCRIPTION_REQUIRED'

  async handle(error: this, ctx: HttpContext) {
    if (ctx.request.accepts(['json']) === 'json') {
      return ctx.response.status(402).json({ message: error.message, upgradeUrl: '/pricing' })
    }
    ctx.session.flash('error', 'This feature requires a Pro plan.')
    return ctx.response.redirect('/pricing')
  }
}
```

## Status pages for production

```ts
protected renderStatusPages = app.inProduction

protected statusPages = {
  '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
  '403': (error, { inertia }) => inertia.render('errors/forbidden', { error }),
  '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
}
```

## Common errors

| Error | Cause | Solution |
|---|---|---|
| `E_ROW_NOT_FOUND` | `findOrFail()` found nothing | Let the handler return 404 |
| `E_INVALID_CREDENTIALS` | Wrong password in `verifyCredentials()` | Flash + redirect in handler |
| `E_VALIDATION_ERROR` (422) | `validateUsing()` failed | Inertia converts to form errors automatically |
| `E_AUTHORIZATION_FAILURE` (403) | `bouncer.authorize()` denied | Handle in handler — 403 status page |
| `E_ROUTE_NOT_FOUND` (404) | Route does not exist | 404 status page |
