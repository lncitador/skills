# Workflow: Events and Listeners

How to use AdonisJS events to decouple side effects from the main flow.

**When to use:** Triggering actions in response to something (send email after signup, update counter after purchase, notify after approval).

---

## When to use Events vs direct calls

```
Do I need confirmation that the action happened before continuing?
├── YES → call the service directly
└── NO  → fire an event (fire and forget)

Examples:
  Create order and wait for payment → call PaymentService directly
  Create order and send confirmation email → fire OrderPlaced event
  Publish post and notify followers → fire PostPublished event
```

Events are ideal for side effects that should not block the HTTP response.

---

## Create an Event and Listener

```bash
node ace make:event OrderPlaced
node ace make:listener SendOrderConfirmation --event=OrderPlaced
```

### Event — carries data only

```ts
// app/events/order_placed.ts
import { BaseEvent } from '@adonisjs/core/events'
import Order from '#models/order'
import User from '#models/user'

export default class OrderPlaced extends BaseEvent {
  constructor(
    public readonly order: Order,
    public readonly user: User,
  ) {
    super()
  }
}
```

### Listener — executes the reaction

```ts
// app/listeners/send_order_confirmation.ts
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import type OrderPlaced from '#events/order_placed'

@inject()
export default class SendOrderConfirmation {
  async handle(event: OrderPlaced) {
    await mail.sendLater((message) => {
      message
        .to(event.user.email)
        .subject(`Order #${event.order.id} confirmed`)
        .htmlView('emails/order_confirmation', {
          order: event.order,
          user: event.user,
        })
    })
  }
}
```

### Register in start/events.ts

```ts
import emitter from '@adonisjs/core/services/emitter'

// Lazy imports — listeners are not loaded at boot
const OrderPlaced = () => import('#events/order_placed')
const SendOrderConfirmation = () => import('#listeners/send_order_confirmation')
const UpdateInventory = () => import('#listeners/update_inventory')
const NotifyAdmin = () => import('#listeners/notify_admin')

// One event can have multiple listeners
emitter.on(OrderPlaced, [SendOrderConfirmation, UpdateInventory, NotifyAdmin])
```

---

## Fire the event in the controller/service

```ts
import emitter from '@adonisjs/core/services/emitter'
import OrderPlaced from '#events/order_placed'

export default class OrdersController {
  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createOrderValidator)
    const order = await Order.create({ ...data, userId: auth.user!.id })

    // Fire event — does not block the response
    await emitter.emit(new OrderPlaced(order, auth.user!))

    return response.redirect().toRoute('orders.show', { id: order.id })
  }
}
```

---

## Common event naming patterns

```ts
// Name as: EntityName + PastTenseAction
UserRegistered     → SendWelcomeEmail, CreateDefaultSettings
UserPasswordReset  → NotifyUserOfPasswordChange
PostPublished      → NotifyFollowers, IndexInSearch, ShareToSocial
OrderPlaced        → SendConfirmation, UpdateInventory, NotifyWarehouse
OrderCancelled     → ProcessRefund, NotifyUser, RestoreInventory
PaymentFailed      → NotifyUser, DisableAccount, AlertFinanceTeam
```

---

## Listener with error handling

```ts
export default class SendOrderConfirmation {
  async handle(event: OrderPlaced) {
    try {
      await mail.sendLater(...)
    } catch (error) {
      // Never throw — a failing listener must not stop other listeners
      logger.error({ error, orderId: event.order.id }, 'Failed to send order confirmation')
    }
  }
}
```

---

## Events with queued listeners (heavy operations)

```ts
export default class GenerateInvoice {
  async handle(event: OrderPlaced) {
    // Instead of generating the PDF here (blocking):
    await queue.dispatch('generate-invoice', { orderId: event.order.id })
  }
}
```

---

## Testing events

```ts
import emitter from '@adonisjs/core/services/emitter'
import OrderPlaced from '#events/order_placed'

test('fires OrderPlaced after creating order', async ({ client, assert }) => {
  const user = await makeUserWithLucidFactory()
  const events = emitter.fake()

  await client.post('/orders').loginAs(user).json({ ... })

  events.assertEmitted(OrderPlaced)
  events.assertEmitted(OrderPlaced, ({ order, user: eventUser }) => {
    assert.equal(eventUser.id, user.id)
    return true
  })

  emitter.restore()
})
```

---

## Checklist

- [ ] Event carries only data — no logic
- [ ] Each listener has one responsibility
- [ ] Listeners catch errors internally — never propagate them
- [ ] Registered in `start/events.ts` with lazy imports
- [ ] Multiple listeners per event as an array in `emitter.on()`
- [ ] `emitter.fake()` in tests
- [ ] Heavy operations dispatched to queue, not run inline in the listener
