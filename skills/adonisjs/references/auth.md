# Auth

## Guards

| Guard | When to use |
|---|---|
| `web` (session) | Web apps with a browser — cookies work naturally |
| `api` (access tokens) | SPA on a different domain, mobile apps, third-party APIs |
| `basic` | Quick prototyping |

## Session guard

```ts
// Protect routes
router.get('/dashboard', [controllers.Dashboard]).use(middleware.auth())

// Guest-only routes (redirect authenticated users)
router.get('/login', handler).use(middleware.guest())

// Login
await auth.use('web').login(user)

// Logout
await auth.use('web').logout()

// Get current user (throws if not authenticated)
const user = auth.getUserOrFail()

// Check without throwing
await auth.check()
const user = auth.user // may be undefined
```

## Access tokens guard

```ts
// Create token
const token = await auth.use('api').createToken(user, ['*'], {
  expiresIn: '30 days',
  name: 'Mobile App Token',
})
return { token: token.value!.release() }

// Authenticate request (Bearer token in header)
await auth.use('api').authenticate()
const user = auth.user!
```

## withAuthFinder — credential verification

```ts
// app/models/user.ts — extends auto-generated UserSchema
import { UserSchema } from '#database/schema'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(UserSchema, AuthFinder) {}

// In login controller:
const user = await User.verifyCredentials(email, password)
// Throws E_INVALID_CREDENTIALS if wrong
```

## Email verification — ALWAYS a public route

```ts
// WRONG — user is not logged in when clicking the email link
router.get('/email/verify/:token', handler).use(middleware.auth())

// CORRECT
router.get('/email/verify/:token', [controllers.EmailVerification, 'verify'])
```

## Rate limiting on auth routes

```ts
// start/limiter.ts
export const authLimiter = limiter.define('auth', (ctx) => {
  return limiter
    .allowRequests(5)
    .every('1 minute')
    .usingKey(`auth_${ctx.request.ip()}`)
})

// start/routes.ts
router.post('/login', handler).use(authLimiter)
router.post('/signup', handler).use(authLimiter)
```

## Bouncer — resource authorization

```ts
// Create policy
node ace make:policy post
node ace add @adonisjs/bouncer  // installs and registers middleware
```

```ts
// app/policies/post_policy.ts
import type User from '#models/user'
import type Post from '#models/post'
import { BasePolicy } from '@adonisjs/bouncer'

export default class PostPolicy extends BasePolicy {
  edit(user: User, post: Post) {
    return user.id === post.userId
  }

  delete(user: User, post: Post) {
    return user.id === post.userId
  }
}
```

```ts
// In controller — authorize() throws 403 if denied
await bouncer.with(PostPolicy).authorize('edit', post)

// In transformer variant — allows() returns boolean, does NOT throw
const canEdit = await bouncer.with(PostPolicy).allows('edit', this.resource)
```

**Key distinction:**
- `.authorize()` → use in controllers, throws `E_AUTHORIZATION_FAILURE` (403) if denied
- `.allows()` → use in transformers/variants, returns `true`/`false` safely

## Security checklist

- [ ] Write routes protected with `middleware.auth()`
- [ ] Guest-only routes (login/signup) protected with `middleware.guest()`
- [ ] Ownership verified with Bouncer before edit/delete
- [ ] Email verification is a public route
- [ ] Login and signup have rate limiting by IP
- [ ] `password` and tokens have `serializeAs: null` in the schema
- [ ] `User.verifyCredentials()` instead of manual password comparison
- [ ] Permission flags pre-computed in transformer variants, not in React
