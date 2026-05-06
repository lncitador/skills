# Test Doubles

Fakes, swaps, and time utilities. **Hit the real test DB — only fake external services.**

---

## Explicit Resource Management — `using` keyword

All built-in fakes support `using` for automatic restore when the test function ends:

```ts
using fakeMail = mail.fake()       // auto-restored when test ends
using fakeEmitter = emitter.fake() // no need to call .restore()
```

If `using` is unavailable, call `.restore()` manually or use a `cleanup` hook.

---

## Emitter fake

Prevents listeners from executing — captures events for assertions:

```ts
import emitter from '@adonisjs/core/services/emitter'
import { events } from '#generated/events'

test('emits UserRegistered on signup', async ({ client }) => {
  using fakeEmitter = emitter.fake()

  await client.post('/signup').form({ email: 'jane@example.com', password: 'secret' })

  // Assert event was emitted
  fakeEmitter.assertEmitted(events.UserRegistered)

  // With condition — callback receives event data, return true to match
  fakeEmitter.assertEmitted(events.UserRegistered, ({ data }) => {
    return data.user.email === 'jane@example.com'
  })

  fakeEmitter.assertNotEmitted(events.OrderPlaced)
  fakeEmitter.assertEmittedCount(events.UserRegistered, 1)
  fakeEmitter.assertNoneEmitted()
})

// Fake only specific events, let others execute normally
emitter.fake([events.UserRegistered, events.OrderUpdated])
```

---

## Hash fake

Replaces bcrypt/argon2 with instant plain-text comparison — use when creating many users:

```ts
import hash from '@adonisjs/core/services/hash'
import { UserFactory } from '#database/factories/user_factory'

test('paginates users', async ({ client }) => {
  using _hash = hash.fake()  // creating 50 users is now instant

  await UserFactory.createMany(50)

  const response = await client.get('/users')
  response.assertStatus(200)
})
```

Only use when password hashing is **not** the focus of the test.

---

## Mail fake

Intercepts emails — prevents real sends, captures for assertions:

```ts
import mail from '@adonisjs/mail/services/main'
import VerifyEmailNotification from '#mails/verify_email'

test('sends verification email on signup', async ({ client }) => {
  using fake = mail.fake()

  await client.post('/register').form({ email: 'user@example.com', password: 'secret' })

  // Assert by mail class
  fake.mails.assertSent(VerifyEmailNotification)

  // With condition — message has helper methods
  fake.mails.assertSent(VerifyEmailNotification, ({ message }) => {
    return message.hasTo('user@example.com').hasSubject('Please verify your email address')
  })

  fake.mails.assertNotSent(PasswordResetNotification)
  fake.mails.assertSentCount(1)
  fake.mails.assertNoneSent()

  // sendLater (queued)
  fake.mails.assertQueued(WelcomeMail)
  fake.mails.assertQueuedCount(1)
  fake.mails.assertNoneQueued()
})
```

**Testing mail classes in isolation:**

```ts
import VerifyEmailNotification from '#mails/verify_email'

test('builds correct email', async () => {
  const user = await UserFactory.create()
  const email = new VerifyEmailNotification(user)

  await email.buildWithContents()  // build without sending

  email.message.assertTo(user.email)
  email.message.assertFrom('noreply@example.com')
  email.message.assertSubject('Please verify your email address')
  email.message.assertHtmlIncludes(`Hello ${user.name}`)
})
```

---

## Drive fake

Replaces a disk with local filesystem — files saved to `./tmp/drive-fakes`, auto-deleted on restore:

```ts
import drive from '@adonisjs/drive/services/main'
import fileGenerator from '@poppinss/file-generator'

test('uploads avatar to storage', async ({ client }) => {
  using fakeDisk = drive.fake('spaces')  // fake the 'spaces' disk (S3 etc.)

  const user = await UserFactory.create()
  const { contents, mime, name } = await fileGenerator.generatePng('1mb')

  await client
    .put('/me')
    .file('avatar', contents, { filename: name, contentType: mime })
    .loginAs(user)

  fakeDisk.assertExists(user.avatar)
})
```

---

## Container swaps

Replace a service with a fake for the duration of the test — original restored automatically:

```ts
// app/services/fake_payment_gateway.ts
export default class FakePaymentGateway extends PaymentGateway {
  charges: Array<{ amount: number }> = []

  async charge(amount: number, token: string) {
    this.charges.push({ amount })
    return { id: 'fake_charge_123', status: 'succeeded' }
  }

  assertCharged(amount: number) {
    if (!this.charges.find(c => c.amount === amount)) {
      throw new Error(`Expected charge of ${amount}`)
    }
  }
}

// In test — swap() auto-restores when test ends
test('charges customer on checkout', async ({ client, swap }) => {
  const fakePayment = swap(PaymentGateway, new FakePaymentGateway())

  await client.post('/checkout').json({ cartId: 'cart_123', paymentToken: 'tok_visa' })

  fakePayment.assertCharged(9999)
})

// Factory function — fresh instance on each resolution
swap(PaymentGateway, () => new FakePaymentGateway())
```

**Reusable fake with `useFake` helper:**

```ts
// tests/helpers/fakes.ts
import { useFake } from '@japa/plugin-adonisjs/helpers'
import PaymentGateway from '#services/payment_gateway'
import FakePaymentGateway from '#services/fake_payment_gateway'

export function useFakePaymentGateway() {
  return useFake(PaymentGateway, new FakePaymentGateway())
}

// In test — no swap/cleanup needed
test('charges on checkout', async ({ client }) => {
  const fakePayment = useFakePaymentGateway()
  await client.post('/checkout').json(data)
  fakePayment.assertCharged(9999)
})
```

**Manual swap with cleanup:**

```ts
test('...', async ({ client, cleanup }) => {
  app.container.swap(PaymentGateway, () => new FakePaymentGateway())
  cleanup(() => app.container.restore(PaymentGateway))
})
```

---

## Time utilities

Both mock `new Date()` and `Date.now()` only — do NOT affect `setTimeout`/`setInterval`.
Both auto-restore when the test ends.

```ts
import { freezeTime, timeTravel } from '@japa/runner'

// freezeTime — lock to specific moment
test('rejects expired tokens', async ({ client }) => {
  const user = await UserFactory.create()
  const token = await user.createToken()

  // Jump 2 hours forward (past 1h expiry)
  freezeTime(new Date(Date.now() + 2 * 60 * 60 * 1000))

  const response = await client.get('/protected').header('Authorization', `Bearer ${token.value}`)
  response.assertStatus(401)
})

// timeTravel — move forward by duration string
test('marks subscription expired after 30 days', async ({ client }) => {
  const user = await UserFactory.with('subscription', 1, (s) =>
    s.merge({ startsAt: new Date() })
  ).create()

  timeTravel('31 days')

  const response = await client.get('/subscription').loginAs(user)
  response.assertBodyContains({ status: 'expired' })
})
```

---

## Filesystem state

```ts
// Install: npm i -D @japa/file-system
// Register in bootstrap.ts:
import { fileSystem } from '@japa/file-system'
export const plugins = [..., fileSystem()]

// In tests — files auto-deleted after test
test('processes uploaded file', async ({ fs }) => {
  await fs.create('document.pdf', 'file contents')
  // file at temporary path managed by plugin
})
```

---

## Redis state

```ts
import redis from '@adonisjs/redis/services/main'

test.group('Cache', (group) => {
  // teardown — clear AFTER each test, not before
  group.each.teardown(async () => {
    await redis.flushdb()
  })

  test('caches a value', async () => {
    // ...
  })
})
```

---

## Sinon.js (edge cases not covered by built-in fakes)

```ts
import sinon from 'sinon'

test.group('Report generation', (group) => {
  // teardown for sinon.restore() — NOT setup
  group.each.teardown(() => sinon.restore())

  test('retries on temporary failure', async ({ client }) => {
    const stub = sinon.stub(ReportService.prototype, 'generate')
    stub.onFirstCall().rejects(new Error('Temporary failure'))
    stub.onSecondCall().resolves({ id: 'report_123' })

    await client.post('/reports')
    sinon.assert.calledTwice(stub)
  })
})
```
