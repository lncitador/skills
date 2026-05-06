# HTTP — Request, Response, Session

## Request

```ts
async handle({ request }: HttpContext) {
  // Body
  request.all()                          // body + query string combined
  request.body()                         // body only
  request.qs()                           // query string only
  request.input('name')                  // specific field
  request.input('name', 'default')       // with default value
  request.only(['name', 'email'])        // whitelist
  request.except(['password'])           // blacklist

  // Route params
  request.param('id')                    // /posts/:id

  // Headers
  request.header('authorization')
  request.header('x-custom', 'fallback')
  request.headers()                      // all headers

  // Method and URL
  request.method()                       // 'GET', 'POST', etc.
  request.url()                          // '/posts/1'
  request.url(true)                      // '/posts/1?page=2' (with query string)
  request.completeUrl()                  // 'https://example.com/posts/1'

  // IP and detection
  request.ip()
  request.ips()                          // array (proxies)
  request.accepts(['json', 'html'])      // content negotiation

  // Files
  request.file('avatar')
  request.files('images')               // multiple files
}
```

## Response

```ts
async handle({ response }: HttpContext) {
  // Status + body helpers
  response.ok({ data: 'hello' })         // 200
  response.created({ id: 1 })            // 201
  response.noContent()                   // 204
  response.badRequest({ error: '...' })  // 400
  response.unauthorized()                // 401
  response.forbidden()                   // 403
  response.notFound()                    // 404
  response.unprocessableEntity(errors)   // 422
  response.internalServerError()         // 500

  // Redirect
  response.redirect('/posts')
  response.redirect().toRoute('posts.index')
  response.redirect().toRoute('posts.show', { id: 1 })
  response.redirect().withQs({ page: 2 }).toRoute('posts.index')
  response.redirect().back()

  // File download
  response.download(app.makePath('storage/file.pdf'))
  response.attachment(app.makePath('storage/file.pdf'), 'report.pdf')

  // Headers
  response.header('X-Custom', 'value')

  // Cookie
  response.cookie('theme', 'dark', { maxAge: '30 days' })
  response.clearCookie('theme')

  // Custom status
  response.status(418).send("I'm a teapot")
}
```

## Session

```ts
async handle({ session }: HttpContext) {
  // Read and write
  session.get('cart')
  session.get('cart', [])                // with default
  session.put('cart', items)
  session.forget('cart')
  session.all()
  session.clear()

  // Flash messages — available only on the NEXT request
  session.flash('success', 'Post created!')
  session.flash('error', 'Something went wrong')

  // Flash input — to repopulate forms after redirect
  session.flashAll()
  session.flashOnly(['email'])
  session.flashExcept(['password'])

  // Read flash (on the next request)
  session.flashMessages.get('success')
  session.flashMessages.all()

  // Regenerate ID (after login — prevents session fixation)
  await session.regenerate()
}
```

**In Edge template:**
```html
@flashMessage('success')
  <div class="alert-success">{{ $message }}</div>
@end

@flashMessage('error')
  <div class="alert-error">{{ $message }}</div>
@end

{{-- Repopulate input after validation error --}}
<input name="email" value="{{ flashMessages.get('old.email', '') }}" />
```

## URL Builder

### Backend — urlFor and signedUrlFor

```ts
import { urlFor, signedUrlFor } from '@adonisjs/core/services/url_builder'

// Named parameters (object)
urlFor('posts.show', { id: 1 })          // /posts/1
urlFor('posts.index')                    // /posts

// Positional parameters (array)
urlFor('posts.show', [1])                // /posts/1

// Multiple params
urlFor('users.posts.show', { userId: 5, postId: 10 })
urlFor('users.posts.show', [5, 10])

// Query string — third argument with qs property
urlFor('posts.index', [], { qs: { page: 2, sort: 'title' } })
urlFor('posts.show', { id: 1 }, { qs: { tab: 'comments' } })
```

### Signed URLs — for tamper-proof links (emails, tokens)

```ts
import { signedUrlFor } from '@adonisjs/core/services/url_builder'

// With expiration + full domain (required when sending externally e.g. in emails)
const unsubscribeUrl = signedUrlFor(
  'newsletter.unsubscribe',
  { email: user.email },
  {
    expiresIn: '30 days',
    prefixUrl: 'https://myapp.com',   // required for external links
  }
)
// Output: https://myapp.com/newsletter/unsubscribe?email=user@example.com&signature=...

// Verify in controller
if (!request.hasValidSignature()) {
  return response.badRequest('Invalid or expired link')
}
```

**`prefixUrl` is required** when the URL will be shared externally (emails, notifications).
For internal navigation, relative URLs are sufficient.

### In Edge templates

```html
{{-- urlFor helper available by default in Edge --}}
<a href="{{ urlFor('posts.show', { id: post.id }) }}">View post</a>
<a href="{{ urlFor('posts.index', [], { qs: { page: 2 } }) }}">Next page</a>

{{-- Hypermedia starter kit — @link component --}}
@link({ route: 'posts.show', routeParams: { id: post.id } })
  View post
@end
```

### In redirects

```ts
// response.redirect().toRoute() — always use this, never hardcode URLs
return response.redirect().toRoute('posts.show', { id: post.id })
return response.redirect().toRoute('posts.index', [], { qs: { page: 2 } })
```

### In services / background jobs

```ts
import { urlFor } from '@adonisjs/core/services/url_builder'

// Use in mail, jobs, services — anywhere outside controllers/templates
const postUrl = urlFor('posts.show', { id: post.id })
```

### Frontend (Inertia apps) — urlFor from ~/client

```ts
// In React/Vue components — import from ~/client (Tuyau-generated, NOT from AdonisJS)
import { urlFor } from '~/client'

// Same API as backend
urlFor('posts.show', { id: post.id })
urlFor('posts.show', [post.id])
urlFor('posts.index', [], { qs: { page: 2, sort: 'title' } })
```

The frontend URL builder is generated by Tuyau into `.adonisjs/client`. It only contains
routes — never backend internals. Configure which routes are exposed in `adonisrc.ts`:

```ts
// adonisrc.ts — exclude routes from frontend bundle
import { generateRegistry } from '@adonisjs/assembler/hooks'

export default defineConfig({
  init: [
    generateRegistry({
      exclude: ['admin.*', /^api\.internal\./, (route) => route.domain === 'admin.myapp.com'],
    })
  ],
})
```

## Content Negotiation

```ts
async show({ request, response, inertia, params }: HttpContext) {
  const post = await Post.findOrFail(params.id)

  if (request.accepts(['json', 'html']) === 'json') {
    return response.ok(new PostTransformer(post))
  }

  return inertia.render('posts/show', { post: new PostTransformer(post) })
}
```
