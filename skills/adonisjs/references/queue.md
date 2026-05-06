# Queue

## When to use a queue

- Sending email (do not block the response)
- Generating PDFs or reports
- Processing images (resize, compression)
- Slow external API calls
- Mass notifications
- Anything that takes more than ~200ms

## Installation

```bash
node ace add @adonisjs/queue
# Choose: redis (recommended for production) or database (simpler)
```

## Create a job

```bash
node ace make:job SendWelcomeEmail
node ace make:job ProcessUploadedImage
node ace make:job GenerateInvoicePdf
```

```ts
// app/jobs/send_welcome_email.ts
import { BaseJob } from '@adonisjs/queue'
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'

export type SendWelcomeEmailPayload = {
  userId: number
}

@inject()
export default class SendWelcomeEmail extends BaseJob<SendWelcomeEmailPayload> {
  async handle({ userId }: SendWelcomeEmailPayload) {
    const user = await User.findOrFail(userId)

    await mail.send((message) => {
      message
        .to(user.email)
        .subject(`Welcome, ${user.fullName}!`)
        .htmlView('emails/welcome', { user })
    })
  }

  async failed(payload: SendWelcomeEmailPayload, error: Error) {
    logger.error({ userId: payload.userId, error }, 'Failed to send welcome email')
  }
}
```

## Dispatching a job

```ts
import queue from '@adonisjs/queue/services/main'
import SendWelcomeEmail from '#jobs/send_welcome_email'

// Does not block the request
await queue.dispatch(SendWelcomeEmail, { userId: user.id })

// With delay
await queue.dispatch(SendWelcomeEmail, { userId: user.id }, { delay: 5000 })

// With priority
await queue.dispatch(SendWelcomeEmail, { userId: user.id }, { priority: 10 })
```

## Jobs with retry

```ts
export default class ProcessImage extends BaseJob<{ imagePath: string }> {
  retries = 3
  retryDelay = 5000  // 5s, 10s, 20s (exponential backoff)

  async handle({ imagePath }: { imagePath: string }) {
    await sharp(imagePath).resize(800).toFile(outputPath)
  }
}
```

## Pattern: Event → Listener → Job

```ts
// In controller — just fire the event
async store({ request, auth, response }: HttpContext) {
  const user = await User.create(data)
  await emitter.emit(new UserRegistered(user))  // non-blocking
  return response.redirect().toRoute('dashboard')
}

// start/events.ts
emitter.on(UserRegistered, [
  SendWelcomeEmailListener,      // → queue.dispatch(SendWelcomeEmail)
  SetupDefaultSettingsListener,  // → queue.dispatch(SetupSettings)
])
```

## Commands

```bash
node ace queue:work          # start worker (production)
node ace queue:work --watch  # with hot reload (dev)
node ace queue:flush         # clear queue
node ace queue:retry         # retry failed jobs
```

## Checklist

- [ ] Jobs contain only the task logic — no complex business logic
- [ ] Job payload uses IDs (not full objects — they can go stale)
- [ ] `failed()` logs the error with enough context for debugging
- [ ] `retries` configured on jobs that depend on external services
- [ ] Worker running as a separate process in production
- [ ] Queue monitored (Bull Board or similar)
