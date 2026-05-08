# AdonisJS Edge Helpers and Tags

This reference covers helpers and tags contributed to Edge by official AdonisJS packages.
For helpers shipped by Edge itself, use the Edge helpers documentation instead.

## HTTP Context Helpers

These values are available when rendering through the HTTP context, for example `ctx.view.render()` or `{ view }` from `HttpContext`.

### `request`

Current HTTP request instance.

```edge
{{ request.url() }}
{{ request.input('signature') }}
```

### `session`

Read-only copy of session data.
Do not mutate session state from templates.

```edge
Post views: {{ session.get(`post.${post.id}.visits`) }}
```

### `flashMessages`

Read-only copy of session flash messages.

```edge
@if(flashMessages.has('notification'))
  <div class="notification {{ flashMessages.get('notification').type }}">
    {{ flashMessages.get('notification').message }}
  </div>
@end
```

### `old`

Shorthand for reading old input values from flash messages.

```edge
<input
  type="text"
  name="email"
  value="{{ old('email') || '' }}"
/>
```

## URL and Application Helpers

### `route` and `signedRoute`

Generate URLs for route identifiers or route patterns.
The second argument is route params as an array or object.
The third argument is an options object.

Common options:

| Option | Purpose |
| --- | --- |
| `qs` | Query string parameters |
| `domain` | Search under a specific route domain |
| `prefixUrl` | Prefix the generated URL |
| `disableRouteLookup` | Enable or disable route lookup |

```edge
<a href="{{ route('posts.show', [post.id]) }}">
  View post
</a>
```

```edge
<a href="{{
  signedRoute('unsubscribe', [user.id], {
    expiresIn: '3 days',
    prefixUrl: 'https://blog.adonisjs.com',
  })
}}">
  Unsubscribe
</a>
```

### `app`

Application instance.

```edge
{{ app.getEnvironment() }}
```

### `config`

Read configuration values.
Use `config.has()` when a value may not exist.

```edge
@if(config.has('app.appUrl'))
  <a href="{{ config('app.appUrl') }}">Home</a>
@else
  <a href="/">Home</a>
@end
```

## Auth and Authorization

### `auth`

Reference to `ctx.auth` when shared by the auth middleware.

```edge
@if(auth.isAuthenticated)
  <p>{{ auth.user.email }}</p>
@end
```

On public pages where auth middleware may not have required a user, silently check the web guard before reading the user.

```edge
@eval(await auth.use('web').check())

@if(auth.use('web').isAuthenticated)
  <p>{{ auth.use('web').user.email }}</p>
@end
```

### `@can` and `@cannot`

Run authorization checks in templates by ability name or policy reference.

```edge
@can('editPost', post)
  <a href="{{ route('posts.edit', [post.id]) }}">Edit</a>
@end

@cannot('editPost', post)
  <span>You cannot edit this post</span>
@end
```

```edge
@can('PostPolicy.edit', post)
  <a href="{{ route('posts.edit', [post.id]) }}">Edit</a>
@end
```

Keep authorization decisions in policies/abilities.
Use template checks only to decide what UI to display.

## I18n

These helpers are available when `@adonisjs/i18n` is configured.

### `t`

Resolve translations.

```edge
<h1>{{ t('messages.greeting') }}</h1>
```

### `i18n`

I18n instance for formatting and lower-level i18n APIs.
When locale detection middleware is used, it should reflect the current request locale.

```edge
{{ i18n.formatCurrency(200, { currency: 'USD' }) }}
```

## Vite and Assets

### `asset`

Resolve the URL of a Vite-processed asset.

```edge
<img src="{{ asset('resources/images/hero.jpg') }}" />
```

### `@vite`

Render Vite script/link tags for configured entrypoints.
The path must match an entrypoint registered in `vite.config.*`.

```edge
@vite(['resources/js/app.js'])
```

```edge
@vite(['resources/js/app.js'], {
  defer: true,
})
```

### `@viteReactRefresh`

Render the React refresh preamble for React projects using Vite.
Use only in React-backed pages/layouts that need React Fast Refresh.

```edge
@viteReactRefresh()
```

## Mail Templates

These helpers are available only when rendering templates for email through the AdonisJS mail package.

### `embedImage` and `embedImageData`

Embed images in email templates.

```edge
<img src="{{
  embedImage(app.makePath('assets/hero.jpg'))
}}" />
```

## Flash Message Tags

### `@flashMessage`

Render a block only when a flash message exists for the key.
The message is exposed as `$message`.

```edge
@flashMessage('notification')
  <div class="notification {{ $message.type }}">
    {{ $message.message }}
  </div>
@end
```

### `@error`

Read error messages stored in the `errorsBag` flash key.
The message is exposed as `$message`.

```edge
@error('E_BAD_CSRF_TOKEN')
  <p>{{ $message }}</p>
@end
```

### `@inputError`

Read validation messages stored in the `inputErrorsBag` flash key.
The messages are exposed as `$messages`.

```edge
@inputError('title')
  @each(message in $messages)
    <p>{{ message }}</p>
  @end
@end
```

## Review Checklist

- HTTP-context values are used only in templates rendered through `ctx.view.render()`.
- Route URLs use `route()` / `signedRoute()` or starter kit route-aware components instead of hard-coded paths.
- Session and flash message data is read-only in templates.
- Auth UI checks do not replace policies or controller authorization.
- Vite entrypoints match the app's Vite config.
- Mail-only helpers are not used in normal HTTP views.
