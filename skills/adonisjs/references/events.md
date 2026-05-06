# Events

## Class-based events (recommended)

```bash
node ace make:event UserRegistered
node ace make:listener SendWelcomeEmail --event=UserRegistered
```

```ts
// app/events/user_registered.ts
import { BaseEvent } from '@adonisjs/core/events'
import User from '#models/user'

export default class UserRegistered extends BaseEvent {
  constructor(
    public readonly user: User,
    public readonly referralCode: string | null = null,
  ) {
    super()
  }
}
```

## Listeners

```ts
// app/listeners/send_welcome_email.ts
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import type UserRegistered from '#events/user_registered'

@inject()
export default class SendWelcomeEmail {
  async handle(event: UserRegistered) {
    // Never throw — catch and log internally
    try {
      await mail.sendLater((message) => {
        message
          .to(event.user.email)
          .subject('Welcome!')
          .htmlView('emails/welcome', { user: event.user })
      })
    } catch (error) {
      logger.error({ error, userId: event.user.id }, 'Failed to send welcome email')
    }
  }
}
```

## Register in start/events.ts

```ts
import emitter from '@adonisjs/core/services/emitter'

// Lazy imports — listeners are not loaded on boot
const UserRegistered = () => import('#events/user_registered')
const SendWelcomeEmail = () => import('#listeners/send_welcome_email')
const CreateDefaultSettings = () => import('#listeners/create_default_settings')
const TrackSignup = () => import('#listeners/track_signup')

// Multiple listeners per event
emitter.on(UserRegistered, [SendWelcomeEmail, CreateDefaultSettings, TrackSignup])
```

## Emitting events

```ts
import emitter from '@adonisjs/core/services/emitter'
import UserRegistered from '#events/user_registered'

// In controller or service — does not block the response
await emitter.emit(new UserRegistered(user, request.input('referral_code')))
```

## Events vs direct calls — when to use each

```
Use event when:
  - Side effects that do not block (email, analytics, push notifications)
  - Multiple reactions to the same occurrence
  - Action that can fail without affecting the main flow

Call directly when:
  - You need the result to continue (payment, creating dependent resource)
  - Only one thing happens
  - Failure must interrupt the flow
```

## Testing events

```ts
import emitter from '@adonisjs/core/services/emitter'
import UserRegistered from '#events/user_registered'

test('fires UserRegistered on signup', async ({ client }) => {
  const events = emitter.fake()

  await client.post('/signup').json({ email: 'new@test.com', ... })

  events.assertEmitted(UserRegistered)
  events.assertEmitted(UserRegistered, ({ user }) => user.email === 'new@test.com')
  events.assertEmittedCount(UserRegistered, 1)

  emitter.restore()
})
```

## Checklist

- [ ] Events carry only data — no logic
- [ ] Listeners have one responsibility each
- [ ] Listeners catch errors internally — never propagate HTTP exceptions
- [ ] Registered in `start/events.ts` with lazy imports
- [ ] `emitter.fake()` in tests
- [ ] Payload uses simple IDs if the object is large (avoid heavy queue payload)
