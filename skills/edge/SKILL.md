---
name: edge
description: >
  Use this skill alongside the adonisjs skill when the project uses the AdonisJS Hypermedia starter kit or Edge.js server-side templates. Trigger for .edge files, view.render(), router.on().render(), resources/views, Edge syntax, AdonisJS Edge helpers, request/auth/session/flashMessages/old/route/signedRoute/config/app/asset/i18n, @vite/@viteReactRefresh/@can/@cannot/@flashMessage/@error/@inputError, template state, interpolation, conditionals, @if/@elseif/@else/@unless, loops, @each, layouts, Edge components, component props, $props, slots, provide/inject, $context, partials, @include/@includeIf, stacks, @stack/@pushTo, form components, CSRF form helpers, field/input/select/textarea components, alert/button/link/avatar components, or debugging templates with @dump.
---

# Edge Templates for AdonisJS

This skill covers the Edge.js server-rendered view layer in AdonisJS Hypermedia apps.
Use `adonisjs` alongside it for controllers, routes, middleware, auth, validation, services, and framework architecture.

## When to Use

Use this skill for:

- Rendering `.edge` templates from controllers or route handlers
- Working in `resources/views/**`
- Applying Edge syntax rules for curly braces, `@` tags, comments, and newline swallowing
- Writing interpolation with `{{ }}`, `{{{ }}}`, `html.safe()`, or escaped `@{{ }}`
- Writing conditional blocks with `@if`, `@elseif`, `@else`, `@unless`, or short ternaries
- Looping over arrays and objects with `@each`, indexes, keys, and empty-state fallbacks
- Building layouts, components, slots, partials, and reusable template fragments
- Building components with props, `$props`, slots, layout components, and provide/inject
- Including partials and pushing template-specific content into stacks
- Passing template state to `view.render()`
- Using AdonisJS-provided Edge helpers and tags from official packages
- Using Hypermedia starter kit form and UI components
- Debugging template variables, helpers, and rendering problems

Do not use this skill for Inertia page components. Use `inertia-vue` or `inertia-react` for those frontend layers.

## References

Load the specific reference that matches the template concern:

| Reference | Use it for |
| --- | --- |
| `references/template-state.md` | Data available to templates: `view.render()` state, framework-provided values, `@let`, `@assign`, globals, and avoiding Edge standalone renderer APIs in AdonisJS |
| `references/syntax-specification.md` | Low-level Edge syntax: curly braces, `@` tags, auto-closing tags, comments, and newline swallowing |
| `references/interpolation.md` | `{{ }}`, `{{{ }}}`, `html.safe()`, multiline expressions, stringified output, escaped frontend braces with `@{{ }}` |
| `references/conditionals.md` | Conditional rendering with `@if`, `@elseif`, `@else`, `@unless`, and short ternaries |
| `references/loops.md` | `@each` over arrays/objects, indexes, object key/value loops, and `@each ... @else` empty states |
| `references/partials-and-stacks.md` | `@include`, `@includeIf`, `@stack`, `@pushTo`, push ordering, and push-once behavior |
| `references/components.md` | Custom Edge components: tag names, props, `$props`, slots, layout components, `@inject`, and `$context` |
| `references/hypermedia-components.md` | Hypermedia starter kit components: layout, form, fields, input/select/textarea, checkbox/radio, alert, button, link, avatar |
| `references/adonisjs-helpers-and-tags.md` | Helpers/tags contributed by AdonisJS packages: `request`, `route`, `signedRoute`, `session`, `flashMessages`, `old`, `auth`, `asset`, `@vite`, `@can`, `@flashMessage`, `@error`, `@inputError` |

## Rendering Templates

Render templates from controllers with `view.render(template, state)`.
The template path is relative to `resources/views` and omits the `.edge` extension.

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

For static pages, routes can render a template directly.

```ts
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home')
```

## Template State

Read `references/template-state.md` when working with data passed to templates, framework-provided values, `@let`, `@assign`, globals, or Edge standalone state APIs.

Every property passed as the second argument to `view.render()` becomes a template variable.
Prefer explicit state names over reaching into broad service objects from the template.

```edge
@layout()
  @each(post in posts)
    <article>
      <h2>{{ post.title }}</h2>
      <p>{{ post.summary }}</p>
    </article>
  @end
@end
```

AdonisJS also shares request/auth context and Edge helpers with templates. When a value is unclear, inspect the state during development with `@dump(state)` or a specific variable with `@dump(posts)`.

## Syntax Defaults

Read `references/interpolation.md` when working with interpolation, multiline JavaScript expressions, stringified output, HTML escaping, or `@{{ }}` escaping for frontend frameworks.
Read `references/syntax-specification.md` when working with low-level Edge syntax rules, tag placement, auto-closing tags, comments, or `~` newline swallowing.
Read `references/conditionals.md` when working with `@if`, `@elseif`, `@else`, `@unless`, or ternary expressions in templates.
Read `references/loops.md` when working with `@each`, indexes, object key/value loops, or `@each ... @else` fallback content.
Read `references/components.md` when working with component files, component tag names, props, `$props`, slots, layout components, `@inject`, or `$context`.
Read `references/partials-and-stacks.md` when working with `@include`, `@includeIf`, `@stack`, `@pushTo`, `@pushToTop`, or push-once stack behavior.
Read `references/adonisjs-helpers-and-tags.md` when working with AdonisJS-provided Edge helpers/tags such as `request`, `route`, `signedRoute`, `session`, `flashMessages`, `old`, `auth`, `asset`, `@vite`, `@can`, `@flashMessage`, `@error`, or `@inputError`.

Use escaped output by default.

```edge
{{ post.title }}
```

Use unescaped output only for trusted HTML that has already been sanitized or generated by trusted code.

```edge
{{{ post.html }}}
```

Common control flow:

```edge
@if(auth.user)
  <p>Welcome back, {{ auth.user.fullName }}</p>
@else
  <p>Please log in</p>
@end

@each(post in posts)
  <h2>{{ post.title }}</h2>
@end
```

## Layouts and Components

The Hypermedia starter kit provides a `@layout()` component at `resources/views/components/layout.edge`.
It owns the HTML document shell and renders page content through the default slot.
Read `references/components.md` when creating or changing custom components.

```edge
@layout()
  <main>
    Page content
  </main>
@end
```

Create reusable components under `resources/views/components`.
The file name becomes the component tag name.

```edge
{{-- resources/views/components/card.edge --}}
<div class="card">
  {{{ await $slots.main() }}}
</div>
```

```edge
@card()
  <h2>Card title</h2>
@end
```

Use the self-closing `@!component()` form only for components that do not need slots.

## Hypermedia Starter Kit Components

Read `references/hypermedia-components.md` when working with the starter kit's pre-built components.

Important defaults:

- Each component renders at most one HTML element.
- Unknown props are passed through as HTML attributes.
- `@form()` injects CSRF protection and supports method spoofing for `PUT`, `PATCH`, and `DELETE`.
- Field controls are composed from `@field.root()`, `@field.label()`, control components, and `@field.error()`.
- `@link()` can generate URLs from named routes with `route`, `routeParams`, and `routeOptions`.

## Form Pattern

Prefer route names over hard-coded URLs when the route is named.

```edge
@form({ route: 'posts.store', method: 'POST' })
  @field.root({ name: 'title' })
    @!field.label({ text: 'Title' })
    @!input.control({ type: 'text', maxlength: '120' })
    @!field.error()
  @end

  @!button({ text: 'Create post', type: 'submit' })
@end
```

For update/delete forms, use method spoofing through the component.

```edge
@form({ route: 'posts.update', method: 'PUT', routeParams: [post.id] })
  {{-- fields --}}
@end
```

## Review Checklist

- Template files live under `resources/views` and use `.edge`.
- Controller state is explicit and named for template usage.
- Request/page-specific data is passed through `view.render()` rather than Edge standalone renderer APIs.
- Escaped output `{{ }}` is the default; unescaped output `{{{ }}}` is justified.
- Multiline interpolation keeps each double-curly delimiter on the same line.
- Edge tags are placed on their own line; use `@!tag()` with no space for auto-closed components.
- Conditional blocks use `@unless` only for simple negated conditions; complex branches use clearer state or `@if`.
- Empty collection states use `@each ... @else` when a fallback is tied directly to the loop.
- Partials are used for markup fragments; components are preferred when props or slots are needed.
- Components forward unknown HTML attributes with `$props.toAttrs()` or `$props.merge(...).toAttrs()` when wrapping native elements.
- Provide/inject is limited to tightly coupled component families, not page-level state.
- Stacks are reserved for content that must render in a layout-owned placeholder, such as page-specific scripts.
- Forms use the starter kit `@form()` component for CSRF/method spoofing.
- Field inputs stay inside `@field.root()` so labels and errors remain accessible.
- Route-aware components use route names instead of duplicated URLs when possible.
- AdonisJS helpers/tags are used only when their contributing package and rendering context are available.
- Debug-only `@dump()` calls are removed before completion.
