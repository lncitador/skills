# Workflow: Debug

Process for diagnosing and resolving the most common errors in AdonisJS, organized by symptom.

**When to use:** Whenever an error, blank page, unexpected behavior, or failing test appears.

---

## Symptom → Cause → Solution

### Cannot find module '#models/...' or '#validators/...'

**Cause:** Path alias not recognized or file does not exist yet.

```bash
# Does the file exist?
ls app/models/

# Does tsconfig.json have the alias?
cat tsconfig.json | grep paths

# Does adonisrc.ts have the alias?
cat adonisrc.ts | grep aliases
```

**Fix in `adonisrc.ts`:**
```ts
aliases: {
  '#models': './app/models',
  '#validators': './app/validators',
  '#services': './app/services',
}
```

---

### E_ROUTE_NOT_FOUND or unexpected 404

**Cause:** Route not registered, middleware blocking, or wrong HTTP method.

```bash
node ace list:routes
```

Check:
- Does the route appear in the list?
- Does the method (GET/POST/PUT/DELETE) match what the form/fetch sends?
- Is there a route group with a prefix that changes the path?
- Is the `auth` middleware redirecting before the route is reached?

**HTML forms only support GET and POST.** For PUT/DELETE via Edge:
```html
<form method="POST" action="/posts/1">
  {{ methodField('DELETE') }}
  {{ csrfField() }}
  <button>Delete</button>
</form>
```

---

### E_MISSING_CSRF_TOKEN (419)

**Cause:** POST form without the CSRF token.

```html
<form method="POST">
  {{ csrfField() }}
  ...
</form>
```

For AJAX/fetch requests, include the header:
```ts
fetch('/posts', {
  method: 'POST',
  headers: {
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
  },
})
```

Inertia handles this automatically.

---

### Validation errors returning 422 without clear message

**Cause:** VineJS threw `ValidationException` but the handler is not converting it correctly.

**To see the raw error in dev:**
```ts
try {
  const data = await request.validateUsing(myValidator)
} catch (e) {
  console.log(e.messages) // see full validation errors
  throw e
}
```

---

### E_UNAUTHORIZED_ACCESS (401) unexpectedly

**Cause:** `middleware.auth()` is applied but the user is not logged in, or the session expired.

```ts
// In controller — log auth state
async index({ auth, logger }: HttpContext) {
  logger.info({ user: auth.user }, 'Current auth state')
}
```

**Common causes:**
- Session cookie not being sent (CORS / domain issue)
- `SESSION_DRIVER=cookie` with different `APP_KEY` between restarts
- API route using session guard instead of access tokens guard

---

### E_ROW_NOT_FOUND (ModelNotFoundException)

**Cause:** `Model.findOrFail()` found no record. Use `lucid` for model/query-specific diagnosis.

```ts
// 1. Let the global handler return 404 automatically
const post = await Post.findOrFail(params.id)

// 2. Handle manually with a custom message
const post = await Post.find(params.id)
if (!post) {
  return response.notFound({ message: 'Post not found' })
}

// 3. Customize in the global handler
import { errors as lucidErrors } from '@adonisjs/lucid'

async handle(error: unknown, ctx: HttpContext) {
  if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
    return ctx.response.status(404).json({ message: 'Resource not found' })
  }
  return super.handle(error, ctx)
}
```

---

### N+1 queries, stale schema, migration failures, or transaction issues

Use the `lucid` skill. Those are data-layer problems.

---

### Wrong import (from '@adonisjs/core' directly)

```ts
// WRONG
import { HttpContext } from '@adonisjs/core'

// CORRECT
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import router from '@adonisjs/core/services/router'
```

---

### Cannot read properties of undefined in tests

**Cause:** Test state, fixture setup, or data loading problem. Use `japa` for test structure and `lucid` for DB/factory/model specifics.

```ts
test.group('MyGroup', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })
  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
```


### Inertia returning JSON instead of rendering page

```ts
// WRONG
async index({ response }: HttpContext) {
  return response.json({ posts })
}

// CORRECT
async index({ inertia }: HttpContext) {
  return inertia.render('posts/index', { posts })
}
```

---

### Migration failing / table already exists

Use `lucid` for migration and schema-generation recovery.

---

## Diagnostic Tools

```bash
# See all registered routes
node ace list:routes

# Interactive REPL
node ace repl

# Use `lucid` for SQL/query debugging
```

**Temporary verbose logging in exception handler:**
```ts
async report(error: unknown, ctx: HttpContext) {
  console.error('ERROR:', error)
  return super.report(error, ctx)
}
```
