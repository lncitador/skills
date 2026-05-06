# API Tests

Real HTTP requests against your app. Tests the entire HTTP layer — routes, middleware, controllers, responses.

## Setup (API starter kit bootstrap.ts)

```ts
import { apiClient } from '@japa/api-client'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

// Type-safe route names in client.visit()
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

export const plugins = [
  assert(),
  pluginAdonisJS(app),
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
]
```

`.env.test` must have:
```dotenv
SESSION_DRIVER=memory
```

---

## Making requests

```ts
// client.visit() — resolves HTTP method + URL from named route (preferred)
const response = await client.visit('new_account.store')        // POST /signup
const response = await client.visit('posts.show', [{ id: 1 }]) // GET /posts/1

// Explicit HTTP methods
const response = await client.get('/api/posts')
const response = await client.post('/api/posts')
const response = await client.put('/api/posts/1')
const response = await client.patch('/api/posts/1')
const response = await client.delete('/api/posts/1')
```

---

## Sending data

```ts
// JSON
await client.visit('posts.store').json({ title: 'Hello', content: '...' })

// Form (URL-encoded)
await client.visit('posts.store').form({ title: 'Hello' })

// Multipart fields
await client.visit('posts.store')
  .field('title', 'Hello')
  .field('content', 'World')

// File upload
await client.visit('users.avatar.update')
  .file('avatar', fileBuffer, { filename: 'avatar.png', contentType: 'image/png' })
```

---

## Authentication

```ts
// Session guard (web) — most common
const user = await User.create({ email: 'test@test.com', password: 'secret' })
const response = await client.visit('posts.store').loginAs(user)

// Token guard (api) — chain withGuard() before loginAs()
const response = await client.visit('posts.store').withGuard('api').loginAs(user)
// Route must allow the guard: middleware.auth({ guards: ['web', 'api'] })
```

---

## Cookies and sessions

```ts
// Set cookie on request
await client.visit('checkout.store').withCookie('affiliateId', '1')
await client.visit('checkout.store').withEncryptedCookie('affiliateId', '1')
await client.visit('checkout.store').withPlainCookie('affiliateId', '1')

// Pre-populate session
await client.visit('checkout.store').withSession({ cartId: 1 })
```

---

## Database cleanup

```ts
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Auth signup', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  // or: group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates user account', async ({ client, assert }) => {
    const response = await client.visit('new_account.store').json({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'secret@123A',
      passwordConfirmation: 'secret@123A',
    })

    response.assertStatus(200)
    response.assertBodyContains({ data: { fullName: 'John Doe', email: 'john@example.com' } })

    // Verify DB side effect directly
    const user = await User.findOrFail(response.body().data.id)
    assert.equal(user.email, 'john@example.com')
  })
})
```

---

## Debugging

```ts
// Dump request before sending
await client.visit('posts.store').dump().json(data)

// Dump response
response.dump()        // full response
response.dumpBody()    // body only
response.dumpHeaders() // headers only

// Check for 500 errors
if (response.hasFatalError()) response.dump()
```

---

## Assertions reference

### Status and body

| Method | Description |
|---|---|
| `assertStatus(status)` | Exact status match |
| `assertBody(body)` | Exact body match |
| `assertBodyContains(subset)` | Body contains subset (deep partial) |
| `assertBodyNotContains(subset)` | Body does not contain subset |
| `assertTextIncludes(text)` | Response text includes substring |

### Headers

| Method | Description |
|---|---|
| `assertHeader(name, value?)` | Header exists, optionally check value |
| `assertHeaderMissing(name)` | Header does not exist |

### Redirects

| Method | Description |
|---|---|
| `assertRedirectsTo(pathname)` | Response redirects to pathname |

### Cookies

| Method | Description |
|---|---|
| `assertCookie(name, value?)` | Cookie exists, optionally check value |
| `assertCookieMissing(name)` | Cookie does not exist |

### Session and flash

| Method | Description |
|---|---|
| `assertSession(key, value?)` | Session key exists, optionally check value |
| `assertSessionMissing(key)` | Key not in session |
| `assertFlashMessage(key, value?)` | Flash message exists, optionally check value |
| `assertFlashMissing(key)` | Key not in flash messages |

### Validation errors (web apps with flash)

| Method | Description |
|---|---|
| `assertHasValidationError(field)` | Flash contains validation error for field |
| `assertDoesNotHaveValidationError(field)` | No validation error for field |
| `assertValidationError(field, message)` | Specific error message for field |
| `assertValidationErrors(field, messages)` | All error messages for field |

---

## Full example

```ts
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

test.group('Auth / signup', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('returns 422 when fields are missing', async ({ client }) => {
    const response = await client.visit('new_account.store')
    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        { field: 'fullName', message: 'The fullName field must be defined', rule: 'required' },
        { field: 'email', message: 'The email field must be defined', rule: 'required' },
      ],
    })
  })

  test('creates user account', async ({ client, assert }) => {
    const response = await client.visit('new_account.store').json({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'secret@123A',
      passwordConfirmation: 'secret@123A',
    })
    response.assertStatus(200)
    response.assertBodyContains({ data: { fullName: 'John Doe' } })

    const user = await User.findOrFail(response.body().data.id)
    assert.equal(user.email, 'john@example.com')
  })
})
```
