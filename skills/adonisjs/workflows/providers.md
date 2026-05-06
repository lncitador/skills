# Workflow: Service Providers and IoC Container

When and how to create Service Providers, register bindings, and use dependency injection correctly.

**When to use:** Creating a custom provider, registering a singleton, integrating a third-party library, or understanding when to use `@inject()` vs direct import.

---

## When you NEED a Service Provider

Create a provider when you need ONE of these four things:

1. **Initialize a third-party library** that must run before routes (Sentry, OpenTelemetry, Stripe SDK)
2. **Register a binding in the container** so `@inject()` resolves an interface
3. **Execute code at a specific lifecycle phase** (register, boot, start, ready, shutdown)
4. **Extend the framework with macros** (add methods to Request, Response, etc.)

If none of these apply → use a direct import or a simple Service class.

---

## Service Provider anatomy

```bash
node ace make:provider AppServiceProvider
```

```ts
// providers/app_service_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'

export default class AppServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * REGISTER: register bindings in the container.
   * Do not access other services here — other providers are not ready yet.
   * Runs first, before all boots.
   */
  register() {
    this.app.container.bind('Stripe', async () => {
      const stripe = await import('stripe')
      return new stripe.Stripe(process.env.STRIPE_SECRET_KEY!)
    })
  }

  /**
   * BOOT: all providers have already run register().
   * Here you can access other services.
   * Good for macros, configs that depend on other services.
   */
  async boot() {
    const { default: Request } = await import('@adonisjs/core/request')

    Request.macro('isJson', function (this: Request) {
      return this.header('accept')?.includes('application/json') ?? false
    })
  }

  /**
   * START: HTTP server is about to start.
   * Good for registering framework event listeners.
   */
  async start() {}

  /**
   * READY: application is ready, server is listening.
   * Good for startup jobs, health checks, cache warm-up.
   */
  async ready() {}

  /**
   * SHUTDOWN: application is shutting down.
   * Good for closing connections and cleaning up resources.
   */
  async shutdown() {}
}
```

Register in `adonisrc.ts`:
```ts
providers: [
  // ... framework providers
  () => import('#providers/app_service_provider'),
]
```

---

## @inject() — automatic dependency injection

Use `@inject()` when a class depends on another and you want the container to resolve it automatically.

```ts
// app/services/notification_service.ts
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'

@inject()
export default class NotificationService {
  async sendWelcome(user: { email: string; fullName: string }) {
    await mail.sendLater((message) => {
      message.to(user.email).subject(`Welcome, ${user.fullName}!`).htmlView('emails/welcome', { user })
    })
  }
}
```

```ts
// app/controllers/users_controller.ts
import { inject } from '@adonisjs/core'
import NotificationService from '#services/notification_service'

@inject()
export default class UsersController {
  constructor(private notificationService: NotificationService) {}

  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createUserValidator)
    const user = await User.create(data)
    await this.notificationService.sendWelcome(user)
    return response.redirect().toRoute('dashboard')
  }
}
```

### Chain injection — Service that depends on another Service

```ts
@inject()
export default class OrderService {
  constructor(
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {}

  async process(order: Order) {
    const payment = await this.paymentService.charge(order)
    await this.notificationService.sendOrderConfirmation(order, payment)
    return order
  }
}
```

---

## Bindings — register implementations for interfaces

Use when you want to swap implementations (e.g. adapting a payment, storage, or email service).

```ts
// Define the interface (contract)
export interface PaymentGateway {
  charge(amount: number, token: string): Promise<{ id: string }>
}

// Real implementation
export default class StripeGateway implements PaymentGateway {
  async charge(amount: number, token: string) {
    return { id: 'charge_123' }
  }
}

// Register in provider
register() {
  this.app.container.bind('PaymentGateway', async () => {
    const { default: StripeGateway } = await import('#services/stripe_gateway')
    return new StripeGateway()
  })
}

// Resolve by name
const gateway = await app.container.make('PaymentGateway')
```

### Singleton — single shared instance

```ts
register() {
  // bind() creates a new instance on every resolution
  this.app.container.bind('Cache', () => new CacheService())

  // singleton() reuses the same instance
  this.app.container.singleton('Cache', () => new CacheService())
}
```

Use `singleton()` for DB connections, API clients, in-memory caches.

---

## Adapter pattern — swap implementations by environment

```ts
abstract class StorageAdapter {
  abstract upload(file: Buffer, path: string): Promise<string>
  abstract delete(path: string): Promise<void>
  abstract getUrl(path: string): Promise<string>
}

class S3Adapter extends StorageAdapter { ... }
class LocalAdapter extends StorageAdapter { ... }

// Provider picks implementation based on env
register() {
  this.app.container.singleton(StorageAdapter, () => {
    return env.get('STORAGE') === 's3' ? new S3Adapter() : new LocalAdapter()
  })
}
```

---

## Macros — extend framework classes

```ts
async boot() {
  const { default: HttpContext } = await import('@adonisjs/core/http')

  HttpContext.macro('isInertia', function (this: HttpContext) {
    return this.request.header('X-Inertia') === 'true'
  })
}
```

```ts
// TypeScript declaration for the macro
// types/http.d.ts
declare module '@adonisjs/core/http' {
  interface HttpContext {
    isInertia(): boolean
  }
}
```

---

## Environments — restrict providers by environment

```ts
// adonisrc.ts
providers: [
  () => import('#providers/app_service_provider'),

  // Web only (not in ace commands)
  {
    file: () => import('#providers/websocket_provider'),
    environment: ['web'],
  },

  // Tests only
  {
    file: () => import('#providers/mock_payment_provider'),
    environment: ['test'],
  },

  // Web and tests (not in console/repl)
  {
    file: () => import('#providers/session_provider'),
    environment: ['web', 'test'],
  },
]
```

---

## Checklist

- [ ] Provider only created when a lifecycle hook or binding is genuinely needed
- [ ] `register()` only registers — no accessing other services
- [ ] `boot()` for macros and configs that depend on other providers
- [ ] `shutdown()` closes external connections opened by the process
- [ ] `@inject()` on every service that has dependencies
- [ ] Singletons for connections and shared clients
- [ ] Interfaces + adapters when you need to swap implementations by environment
- [ ] Provider restricted to the correct environment (no WebSocket loading in CLI)
