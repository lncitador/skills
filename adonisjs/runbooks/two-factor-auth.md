# Runbook: Two-Factor Authentication

Use this runbook for the AdonisJS framework flow around TOTP: routes, controllers, validators, session state, middleware, recovery-code response behavior, and tests. Use `lucid` for tables/models/relationships and `japa` for test structure.

## Data Prerequisite

Use `lucid` to design and implement:

- TOTP config table
- Recovery code storage
- User relationship or lookup strategy
- Token/recovery-code serialization and hashing
- Factories for enabled/disabled 2FA users

## Routes

Authenticated setup routes:

```ts
router.group(() => {
  router.get('/settings/two-factor', [controllers.TwoFactorSettings, 'show'])
  router.post('/settings/two-factor', [controllers.TwoFactorSettings, 'store'])
  router.delete('/settings/two-factor', [controllers.TwoFactorSettings, 'destroy'])
}).use(middleware.auth())
```

Challenge routes:

```ts
router.group(() => {
  router.get('/two-factor/challenge', [controllers.TwoFactorChallenge, 'create'])
  router.post('/two-factor/challenge', [controllers.TwoFactorChallenge, 'store'])
})
```

## Validators

```ts
import vine from '@vinejs/vine'

export const enableTwoFactorValidator = vine.create({
  code: vine.string().trim().fixedLength(6),
})

export const challengeValidator = vine.create({
  code: vine.string().trim().minLength(6).maxLength(24),
})
```

Use separate validators for enabling, challenging, disabling, and recovery-code flows when the payloads differ.

## Controller Boundaries

Controllers should:

- Validate the submitted code.
- Call a service that verifies TOTP/recovery codes.
- Set or clear session markers.
- Redirect with clear flash messages.

Controllers should not:

- Implement cryptographic details inline.
- Store secrets directly without hashing/encryption strategy.
- Build database schema or model rules; use `lucid`.

## Session and Middleware

After password login, if the user has 2FA enabled:

1. Store a temporary user/session marker.
2. Redirect to `/two-factor/challenge`.
3. Complete full login only after TOTP or recovery-code verification succeeds.

Protect authenticated areas with middleware that rejects incomplete 2FA sessions.

## Recovery Codes

Show recovery codes once after enabling 2FA. Store only hashed recovery codes. When one is used, invalidate it.

## Tests

Use `japa` plus `lucid` factories.

Cover:

- Enable 2FA with valid code
- Reject invalid setup code
- Login requires challenge when enabled
- Challenge accepts valid TOTP
- Challenge accepts valid recovery code and invalidates it
- Disable 2FA
- Protected route rejects incomplete 2FA session
