---
name: adonisjs
description: >
  Use this skill whenever the user is working with AdonisJS v7 backend framework code: controllers, routes, middleware, services, VineJS validators, Transformers, Bouncer policies, events, listeners, mail, cache, queue, exceptions, Ace commands, request/response/session handling, or backend architecture and review. Trigger for "create a controller", "add validation", "create a service", "add a policy", "wire routes", "handle an exception", or AdonisJS backend review/debugging. For Lucid ORM, migrations, schema generation, models, relationships, query builders, transactions, factories, or seeders, use the lucid skill alongside or instead of this one. For Japa tests, use the japa skill. For Inertia frontend patterns, use inertia-react or inertia-vue alongside this one.
---

# AdonisJS Backend Skill

## Boundary With Lucid

This skill covers the AdonisJS framework layer. Load `lucid` for database and ORM work:

- Migrations and schema generation
- `database/schema.ts`
- Model files and model hooks/scopes/serialization
- Relationships and preloads
- Query builders and transactions
- Factories and seeders

AdonisJS controllers, transformers, policies, and services may consume Lucid models, but the rules for defining/querying those models live in `lucid`.

---

## Core Conventions

### Routing (start/routes.ts)

```ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'

// CRITICAL: fixed routes BEFORE dynamic params
router.get('/posts/create', [controllers.Posts, 'create']).use(middleware.auth())
router.post('/posts', [controllers.Posts, 'store']).use(middleware.auth())
router.get('/posts/:id', [controllers.Posts, 'show'])
router.get('/posts/:id/edit', [controllers.Posts, 'edit']).use(middleware.auth())
router.put('/posts/:id', [controllers.Posts, 'update']).use(middleware.auth())

// Guest-only
router.group(() => {
  router.get('/login', [controllers.Session, 'create'])
  router.post('/login', [controllers.Session, 'store'])
}).use(middleware.guest())
```

### Controllers (app/controllers/)

```ts
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'
import PostPolicy from '#policies/post_policy'
import { createPostValidator } from '#validators/post'
import postsService from '#services/posts_service'

export default class PostsController {
  async index({ inertia }: HttpContext) {   // swap inertia for view/serialize per architecture
    const posts = await postsService.listForIndex()
    return inertia.render('posts/index', { posts: PostTransformer.transform(posts) })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createPostValidator)
    await postsService.create(auth.user!, payload)
    return response.redirect().toRoute('posts.index')
  }

  async update({ bouncer, params, request, response, session }: HttpContext) {
    const post = await postsService.findForUpdate(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)  // throws 403 if denied
    const data = await request.validateUsing(updatePostValidator)
    await postsService.update(post, data)
    session.flash('success', 'Post updated successfully')
    return response.redirect().toRoute('posts.show', { id: post.id })
  }
}
```

### Transformers (app/transformers/)

```ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import type Post from '#models/post'
import PostPolicy from '#policies/post_policy'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'url', 'summary', 'createdAt']),
      author: UserTransformer.transform(this.resource.author),
      // whenLoaded() — omits field if relation was not preloaded
      comments: CommentTransformer.transform(this.whenLoaded(this.resource.comments)),
    }
  }

  // Variant — extends toObject() with permission flags
  @inject()
  async forDetailedView({ bouncer }: HttpContext) {
    return {
      ...this.toObject(),
      can: {
        edit: await bouncer.with(PostPolicy).allows('edit', this.resource),
        delete: await bouncer.with(PostPolicy).allows('delete', this.resource),
      },
    }
  }
}

// Single:    PostTransformer.transform(post)
// Array:     PostTransformer.transform(posts)
// Variant:   PostTransformer.transform(post).useVariant('forDetailedView')
// Paginated: PostTransformer.paginate(posts.all(), posts.getMeta())
```

### Validation (app/validators/)

```ts
import vine from '@vinejs/vine'

// vine.create() — not vine.compile()
export const createPostValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(255),
  url: vine.string().url(),
  summary: vine.string().trim().minLength(80).maxLength(500),
})

// Clone schema to reuse rules for update
export const updatePostValidator = vine.create(
  createPostValidator.schema.clone()
)
```

---

## Critical Import Rules

```ts
// WRONG — never import from root package
import { HttpContext } from '@adonisjs/core'

// CORRECT sub-path imports
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { BasePolicy } from '@adonisjs/bouncer'
import router from '@adonisjs/core/services/router'
import { urlFor, signedUrlFor } from '@adonisjs/core/services/url_builder'
import vine from '@vinejs/vine'
import Post from '#models/post'
import { controllers } from '#generated/controllers'
```

---

## Workflows

| Situation | File |
|---|---|
| Implementing any new feature | workflows/build-feature.md |
| Debugging errors, unexpected behavior | workflows/debug.md |
| Creating Service Providers, bindings, IoC | workflows/providers.md |
| Customizing errors, domain exceptions | workflows/exceptions.md |
| Decoupling side effects with events | workflows/events.md |
| Reviewing a PR or code snippet | workflows/code-review.md |

---

## References

| Topic | File |
|---|---|
| Architecture, folder structure, three rendering modes | references/architecture.md |
| Auth, guards, Bouncer (.authorize vs .allows) | references/auth.md |
| Cache, invalidation, TTL, tags | references/cache.md |
| Controllers, resource vs action, route ordering | references/controllers.md |
| Events, listeners, emitter | references/events.md |
| Exceptions handler, custom domain errors | references/exceptions.md |
| HTTP — request, response, session, URL builder | references/http.md |
| Mail — send, mail classes, templates, testing | references/mail.md |
| Middleware — named, params, global | references/middleware.md |
| Performance — cache, queues, deferred expensive work | references/performance.md |
| Queue, jobs, retry, workers | references/queue.md |
| Security — hashing, encryption, CORS, CSRF | references/security.md |
| Transformers — BaseTransformer, pick, whenLoaded, variants | references/transformers.md |
| VineJS validations — vine.create(), all field types | references/validations.md |
| Ace commands — create, args, flags, prompts | references/ace-commands.md |

---

## Ace CLI Quick Reference

```bash
node ace make:controller Post --resource
node ace make:validator post
node ace make:transformer post
node ace make:policy post
node ace make:service PostService
node ace make:event OrderPlaced
node ace make:listener SendEmail --event=OrderPlaced
node ace make:job ProcessImage
node ace make:middleware AuthMiddleware
node ace make:exception DomainException
node ace make:command SendReminders
node ace make:mail OrderConfirmation
node ace list:routes
node ace repl
node ace generate:key
# Types in @generated/data are auto-generated by the dev server — no manual command
```

---

## Anti-Patterns

| Wrong | Correct |
|---|---|
| `vine.compile()` | `vine.create()` |
| Inline validation in controller | Separate `app/validators/` file |
| Business logic in controller | Move to `app/services/` |
| Side effects (email) in controller | Events + Listeners |
| `import from '@adonisjs/core'` directly | Sub-path: `'@adonisjs/core/http'` etc. |
| 8+ methods on one controller | Split into focused Action controllers |
| Email verification behind auth middleware | Verification routes must be public |
| Dynamic route (`:id`) before fixed route (`/create`) | Fixed routes first |
| `bouncer.authorize()` in transformers | `bouncer.allows()` in transformers |
| `router.makeUrl()` | `urlFor()` from `@adonisjs/core/services/url_builder` |
| `{{ route('...') }}` in Edge | `{{ urlFor('...') }}` in Edge |
| Missing `prefixUrl` in `signedUrlFor` for emails | Always pass `prefixUrl` for external links |
