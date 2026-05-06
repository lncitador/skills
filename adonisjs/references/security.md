# Security

## Hashing (passwords)

```ts
import hash from '@adonisjs/core/services/hash'

const hashed = await hash.make('user_password')
const isValid = await hash.verify(hashed, 'typed_password')
```

For model hooks that auto-hash password fields before save, use the `lucid` skill.

**Default driver:** `scrypt` (recommended). Configure in `config/hash.ts`.

**NEVER** use `md5`, `sha1`, `sha256` for passwords. Always `hash.make()` + `hash.verify()`.

## Encryption (reversible sensitive data)

```ts
import encryption from '@adonisjs/core/services/encryption'

// Encrypt — for data that needs to be read back (2FA secrets, reset tokens)
const encrypted = encryption.encrypt('sensitive-data')

// Decrypt
const original = encryption.decrypt(encrypted) as string
// returns null if value was tampered with

// With expiration
const token = encryption.encrypt('reset-token', '1 hour')
const value = encryption.decrypt(token) // null after 1 hour
```

**When to use encryption vs hash:**
- `hash` → passwords (one-way, never need to recover the original)
- `encryption` → 2FA secrets, reset tokens, data that needs to be read back

## CORS

```ts
// config/cors.ts
import { defineConfig } from '@adonisjs/cors'

export default defineConfig({
  enabled: true,
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
  // In dev: origin: true (allows any origin)
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  credentials: true,  // allows cookies (session, auth)
  maxAge: 90,
})
```

**Common configurations by scenario:**

```ts
// SPA on the same domain (api.example.com → example.com)
origin: ['https://example.com'],
credentials: true,

// Public API (no cookies, any origin)
origin: true,
credentials: false,

// Private API for mobile/third-party
origin: ['https://partner.com'],
credentials: false,
```

## CSRF Protection

Enabled by default for web apps. Does not apply to APIs using access tokens.

```ts
// config/shield.ts
csrf: {
  enabled: true,
  exceptRoutes: [
    '/webhooks/*',  // webhooks have no CSRF
    '/api/*',       // API routes use tokens
  ],
}
```

In Edge forms, always include:
```html
<form method="POST">
  {{ csrfField() }}
</form>
```

Inertia handles this automatically.

## Environment variables

```ts
// start/env.ts — validate and type all env vars
import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  STRIPE_SECRET_KEY: Env.schema.string(),
  RESEND_API_KEY: Env.schema.string(),
  SENTRY_DSN: Env.schema.string.optional(),
})
```

The application will not start if a required variable is missing.

## Security checklist

- [ ] `APP_KEY` generated with `node ace generate:key` — never hardcoded
- [ ] Passwords always with `hash.make()` — never store plaintext
- [ ] Reversible sensitive data encrypted with `encryption.encrypt()`
- [ ] CORS configured with explicit origins in production — never `origin: true` in prod
- [ ] CSRF enabled for web apps, excepting only API/webhook routes
- [ ] Password and token model serialization handled with `lucid`
- [ ] `.env` in `.gitignore` — never commit secrets
- [ ] Env vars validated in `start/env.ts` — app fails to start with missing vars
