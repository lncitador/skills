---
name: adonisjs
description: >
  Use this skill whenever the user is working with AdonisJS v7 backend — controllers, Lucid ORM, VineJS validators, Transformers, Bouncer policies, migrations, models, events, middleware, Ace commands, services, or any backend feature. Trigger for "create a controller", "write a migration", "set up auth", "add validation", "create a service", "write tests with Japa", "add a policy", or any AdonisJS backend task. Also trigger when reviewing AdonisJS code or debugging backend errors. This skill is frontend-agnostic — it works regardless of whether the project uses Inertia, Edge templates, or serves a JSON API. For Inertia-specific frontend patterns, use the inertia-react or inertia-vue skill alongside this one. For writing tests with Japa, use the japa skill.
---

# AdonisJS Backend Skill

## CRITICAL: v7 Model Pattern

Models do NOT define columns. Columns are auto-generated in `database/schema.ts` when
you run migrations. Model files only contain relationships and business logic.

```ts
// database/schema.ts — AUTO-GENERATED. Never edit manually.
export class PostSchema extends BaseModel {
  @column({ isPrimary: true }) declare id: number
  @column() declare title: string
  // all columns here, auto-generated from migrations
}

// app/models/post.ts — YOUR file. Only relationships + business logic.
import { PostSchema } from '#database/schema'
import { hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Post extends PostSchema {
  @hasMany(() => Comment) declare comments: HasMany<typeof Comment>
  @belongsTo(() => User) declare user: BelongsTo<typeof User>
}
```

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
import Post from '#models/post'
import PostTransformer from '#transformers/post_transformer'
import PostPolicy from '#policies/post_policy'
import { createPostValidator } from '#validators/post'

export default class PostsController {
  async index({ inertia }: HttpContext) {   // swap inertia for view/serialize per architecture
    const posts = await Post.query().preload('user').orderBy('createdAt', 'desc')
    return inertia.render('posts/index', { posts: PostTransformer.transform(posts) })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createPostValidator)
    await Post.create({ ...payload, userId: auth.user!.id })
    return response.redirect().toRoute('posts.index')
  }

  async update({ bouncer, params, request, response, session }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await bouncer.with(PostPolicy).authorize('edit', post)  // throws 403 if denied
    const data = await request.validateUsing(updatePostValidator)
    await post.merge(data).save()
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
import { hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { BasePolicy } from '@adonisjs/bouncer'
import router from '@adonisjs/core/services/router'
import { urlFor, signedUrlFor } from '@adonisjs/core/services/url_builder'
import vine from '@vinejs/vine'
import Post from '#models/post'
import { PostSchema } from '#database/schema'
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

## Runbooks

| Feature | File |
|---|---|
| Auth — signup, login, email verification, rate limiting | runbooks/auth.md |
| Full CRUD resource | runbooks/crud.md |
| Two-Factor Authentication (TOTP + recovery codes) | runbooks/two-factor-auth.md |
| File uploads with Drive | runbooks/file-upload.md |

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
| Migrations, column types, schema.ts auto-generation | references/migrations.md |
| Models — relations only, extends PostSchema (v7) | references/models.md |
| Performance, N+1, pagination, indexes | references/performance.md |
| Queue, jobs, retry, workers | references/queue.md |
| Security — hashing, encryption, CORS, CSRF | references/security.md |
| Transformers — BaseTransformer, pick, whenLoaded, variants | references/transformers.md |
| VineJS validations — vine.create(), all field types | references/validations.md |
| Ace commands — create, args, flags, prompts | references/ace-commands.md |

---

## Ace CLI Quick Reference

```bash
node ace make:controller Post --resource
node ace make:model Post -m
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
node ace make:factory Post
node ace make:seeder PostSeeder
node ace migration:run
node ace migration:rollback
node ace migration:status
node ace db:seed
node ace list:routes
node ace repl
node ace generate:key
# Types in @generated/data are auto-generated by the dev server — no manual command
```

---

## Anti-Patterns

| Wrong | Correct |
|---|---|
| `@column()` in model file | Columns in migrations → auto-generated in schema.ts |
| `class Post extends BaseModel` | `class Post extends PostSchema` from `#database/schema` |
| `vine.compile()` | `vine.create()` |
| Inline validation in controller | Separate `app/validators/` file |
| Business logic in controller | Move to `app/services/` |
| Side effects (email) in controller | Events + Listeners |
| `import from '@adonisjs/core'` directly | Sub-path: `'@adonisjs/core/http'` etc. |
| Accessing relation without preload in loop | `preload()` before the loop |
| 8+ methods on one controller | Split into focused Action controllers |
| `Model.all()` in production list routes | Always paginate |
| Email verification behind auth middleware | Verification routes must be public |
| Dynamic route (`:id`) before fixed route (`/create`) | Fixed routes first |
| `bouncer.authorize()` in transformers | `bouncer.allows()` in transformers |
| `router.makeUrl()` | `urlFor()` from `@adonisjs/core/services/url_builder` |
| `{{ route('...') }}` in Edge | `{{ urlFor('...') }}` in Edge |
| Missing `prefixUrl` in `signedUrlFor` for emails | Always pass `prefixUrl` for external links |
