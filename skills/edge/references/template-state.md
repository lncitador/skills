# Template State

Template state is the data available to an Edge template during rendering.
In AdonisJS, prefer the HTTP context `view` renderer and keep page-specific data explicit.

Edge templates render on the server. Template state is not automatically shared with client-side JavaScript.

## Page-Specific State

Pass page-specific data as the second argument to `view.render()`.
Each object property becomes a variable in the template.

```ts
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  async index({ view }: HttpContext) {
    return view.render('pages/posts/index', {
      posts: await Post.all(),
    })
  }
}
```

```edge
@each(post in posts)
  <article>
    <h2>{{ post.title }}</h2>
  </article>
@end
```

Use clear state names that match the template's job.
Avoid passing broad service objects or database models with unrelated data when a smaller view model would be clearer.

## Framework-Provided Values

AdonisJS also makes framework context and helpers available to templates, such as request/auth context and route helpers.
Use these for framework concerns, but keep page content and query results in explicit `view.render()` state.

When the available state is unclear during development, inspect it with `@dump(state)` or a specific variable.
Remove debug dumps before completion.

## Inline Variables

Use `@let` for template-local variables and `@assign` to update them.
Inline variables are scoped like JavaScript `let` variables.

```edge
@let(total = 0)

<ul>
  @each(item in items)
    @assign(total = total + item.price)
    <li>{{ item.name }} = {{ item.price }}</li>
  @end

  <li>Gross total = {{ total }}</li>
</ul>
```

Keep inline variables for small template-local calculations.
Move business rules, authorization decisions, or query work to controllers/services before rendering.

## Globals

Use globals for values or helpers that should be available to all templates.
In AdonisJS, register custom Edge globals from a preload file.

```bash
node ace make:preload view
```

Globals are appropriate for application-wide helpers or stable config.
Do not use globals for request-specific page data.

## Edge Standalone APIs

The Edge standalone documentation covers APIs such as `edge.createRenderer()` and renderer-level locals.
Those APIs are useful when using Edge outside AdonisJS, for example with a custom HTTP server.

In AdonisJS apps, you usually do not need `edge.createRenderer()` for request rendering because the framework provides the request-aware `view` renderer through the HTTP context.
Use `view.render()` for page state and AdonisJS framework mechanisms for shared request data.
