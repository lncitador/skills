# Runbook: Full Auth

Implements signup, login, logout, email verification, and rate limiting from scratch.

**When to use:** Adding authentication to an AdonisJS project that does not have it yet.

**Prerequisites:** `node ace add @adonisjs/auth`, `node ace add @adonisjs/mail`, `node ace add @adonisjs/limiter`

---

## Step 1 — Users migration

Create `database/migrations/TIMESTAMP_create_users_table.ts`:

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.boolean('email_verified').defaultTo(false)
      table.string('email_verification_token').nullable()
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

Run: `node ace migration:run`

---

## Step 2 — User model

`app/models/user.ts`:

```ts
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare emailVerified: boolean

  @column({ serializeAs: null })
  declare emailVerificationToken: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

---

## Step 3 — Validators

`app/validators/auth.ts`:

```ts
import vine from '@vinejs/vine'

export const signupValidator = vine.create(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).confirmed(),
  })
)

export const loginValidator = vine.create(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(1),
  })
)
```

---

## Step 4 — Rate limiting

`start/limiter.ts`:

```ts
import limiter from '@adonisjs/limiter/services/main'

export const authLimiter = limiter.define('auth', (ctx) => {
  return limiter
    .allowRequests(5)
    .every('1 minute')
    .usingKey(`auth_${ctx.request.ip()}`)
    .limitExceeded((error) => {
      error.setMessage('Too many attempts. Please wait 1 minute.')
      error.setStatus(429)
    })
})
```

---

## Step 5 — Controllers

### app/controllers/new_account_controller.ts (signup)

```ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { signupValidator } from '#validators/auth'
import mail from '@adonisjs/mail/services/main'
import string from '@adonisjs/core/helpers/string'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup')
  }

  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(signupValidator)
    const token = string.generateRandom(64)

    const user = await User.create({ ...data, emailVerificationToken: token })

    await mail.sendLater((message) => {
      message
        .to(user.email)
        .subject('Confirm your email')
        .htmlView('emails/verify_email', { user, token })
    })

    await auth.use('web').login(user)
    return response.redirect().toRoute('email.verification.notice')
  }
}
```

### app/controllers/session_controller.ts (login/logout)

```ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator } from '#validators/auth'

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)

    if (!user.emailVerified) {
      session.flash('error', 'Please verify your email before signing in.')
      return response.redirect().back()
    }

    await auth.use('web').login(user)
    return response.redirect().toRoute('dashboard')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('login')
  }
}
```

### app/controllers/email_verification_controller.ts

```ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class EmailVerificationController {
  // Notice page: "Check your email" — PUBLIC ROUTE
  async notice({ inertia }: HttpContext) {
    return inertia.render('auth/verify_email_notice')
  }

  // Link handler from email — PUBLIC ROUTE
  async verify({ params, response, session }: HttpContext) {
    const user = await User.findByOrFail('emailVerificationToken', params.token)
    user.emailVerified = true
    user.emailVerificationToken = null
    await user.save()

    session.flash('success', 'Email confirmed! Please sign in.')
    return response.redirect().toRoute('login')
  }

  // Resend verification email — requires auth
  async resend({ auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    // ... resend email logic
    session.flash('success', 'Email resent!')
    return response.redirect().back()
  }
}
```

---

## Step 6 — Routes

`start/routes.ts`:

```ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { authLimiter } from '#start/limiter'
import { controllers } from '#generated/controllers'

// Auth — PUBLIC routes
router.get('/signup', [controllers.NewAccount, 'create']).as('signup')
router.post('/signup', [controllers.NewAccount, 'store']).as('signup.store').use(authLimiter)

router.get('/login', [controllers.Session, 'create']).as('login')
router.post('/login', [controllers.Session, 'store']).as('login.store').use(authLimiter)

// Email verification — PUBLIC (token is in the link)
router.get('/email/verify', [controllers.EmailVerification, 'notice']).as('email.verification.notice')
router.get('/email/verify/:token', [controllers.EmailVerification, 'verify']).as('email.verification.verify')

// Resend verification — requires being logged in
router
  .post('/email/verify/resend', [controllers.EmailVerification, 'resend'])
  .as('email.verification.resend')
  .use(middleware.auth())

// Logout — requires auth
router.delete('/logout', [controllers.Session, 'destroy']).as('logout').use(middleware.auth())
```

---

## Step 7 — Email template

`resources/views/emails/verify_email.edge`:

```html
<h1>Confirm your email</h1>
<p>Hi {{ user.fullName }},</p>
<p>
  <a href="{{ urlFor('email.verification.verify', { token }) }}">
    Click here to confirm your email
  </a>
</p>
```

---

## Step 8 — Tests

```ts
import { test } from '@japa/runner'
import User from '#models/user'
import UserFactory from '#database/factories/user_factory'

test.group('Auth / Signup', (group) => {
  group.each.setup(async () => { await db.beginGlobalTransaction() })
  group.each.teardown(async () => { await db.rollbackGlobalTransaction() })

  test('creates user and redirects to email verification notice', async ({ client }) => {
    const response = await client.post('/signup').json({
      fullName: 'John Smith',
      email: 'john@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    })
    response.assertRedirectsTo('/email/verify')
    const user = await User.findByOrFail('email', 'john@example.com')
    assert.isFalse(user.emailVerified)
  })
})

test.group('Auth / Login', (group) => {
  test('blocks login without verified email', async ({ client }) => {
    const user = await UserFactory.merge({ emailVerified: false }).create()
    const response = await client.post('/login').json({ email: user.email, password: 'password123' })
    response.assertRedirectsTo('/login')
  })

  test('logs in with valid credentials', async ({ client }) => {
    const user = await UserFactory.merge({ emailVerified: true }).create()
    const response = await client.post('/login').json({ email: user.email, password: 'password123' })
    response.assertRedirectsTo('/dashboard')
  })
})
```

---

## Final checklist

- [ ] Migration ran
- [ ] Model with `withAuthFinder` and `emailVerified`
- [ ] Validators in a separate file
- [ ] Rate limiting on login and signup
- [ ] Email verification routes are PUBLIC
- [ ] Signup controller auto-logs in the user after registration
- [ ] Login controller blocks unverified email
- [ ] Email sent with `mail.sendLater` (non-blocking)
- [ ] Tests cover happy path and email-not-verified blocking
