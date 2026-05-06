# Runbook: Auth

Use this runbook for the AdonisJS auth flow: routes, controllers, validators, middleware, redirects, Bouncer boundaries, mail/events, and session behavior. Use `lucid` for users table/model/factory details and `japa` for tests.

## Data Prerequisite

Before wiring controllers, make sure the user data contract exists. Use `lucid` for:

- Users migration
- User model and auth finder mixin shape
- Email verification columns
- Password/token serialization
- User factories

## Routes

Guest-only routes:

```ts
router.group(() => {
  router.get('/login', [controllers.Session, 'create'])
  router.post('/login', [controllers.Session, 'store'])
  router.get('/register', [controllers.Registration, 'create'])
  router.post('/register', [controllers.Registration, 'store'])
}).use(middleware.guest())
```

Authenticated routes:

```ts
router.group(() => {
  router.delete('/logout', [controllers.Session, 'destroy'])
  router.get('/email/verify', [controllers.EmailVerification, 'notice'])
  router.post('/email/verification-notification', [controllers.EmailVerification, 'send'])
}).use(middleware.auth())
```

Email verification callbacks must be public if the user may arrive from an email link without an active session.

## Validators

Keep login/register validators in `app/validators`.

```ts
import vine from '@vinejs/vine'

export const loginValidator = vine.create({
  email: vine.string().trim().email().normalizeEmail(),
  password: vine.string().minLength(8),
})

export const registerValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(120),
  email: vine.string().trim().email().normalizeEmail(),
  password: vine.string().minLength(8).confirmed(),
})
```

For DB-backed unique/exists rules, use `lucid`.

## Session Controller

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '#validators/auth'
import User from '#models/user'

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)
    await auth.use('web').login(user)
    return response.redirect().toRoute('dashboard')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('login')
  }
}
```

## Registration Controller

Keep persistence and domain details small. If registration has multiple side effects, move them into a service and emit events/listeners for mail.

```ts
export default class RegistrationController {
  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const user = await usersService.register(payload)
    await auth.use('web').login(user)
    return response.redirect().toRoute('dashboard')
  }
}
```

## Email Verification

Use signed URLs for verification links. Keep mail sending in mail classes/listeners, not inline in controllers.

## Middleware

Use `middleware.auth()` for authenticated routes and `middleware.guest()` for routes only anonymous users should access.

If an area requires verified email, create or use a dedicated middleware that checks the authenticated user and redirects to the verification notice.

## Tests

Use `japa` for API/browser test patterns and `lucid` for users/factories/database state.

Cover:

- Register success
- Login success
- Invalid credentials
- Logout
- Guest-only redirect for authenticated users
- Auth-only redirect for guests
- Email verification happy path when enabled
