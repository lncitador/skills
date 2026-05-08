# Hypermedia Starter Kit Components

The Hypermedia starter kit includes unstyled Edge components for common HTML and form patterns.
Each component renders at most one HTML element and passes unknown props through as HTML attributes.

## Layout

Renders the full HTML document shell.

```edge
@layout()
  <main>Page content goes here</main>
@end
```

## Form

Renders a form with CSRF token injection.
Supports `PUT`, `PATCH`, and `DELETE` through method spoofing.

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `action` | `string` | Direct form action URL |
| `method` | `string` | HTTP method |
| `route` | `string` | Named route used to compute the action URL |
| `routeParams` | `array` | Parameters for the named route |
| `routeOptions` | `object` | Extra URL generation options, such as query strings |

```edge
@form({ route: 'posts.store', method: 'POST' })
  {{-- fields --}}
@end

@form({ route: 'posts.update', method: 'PUT', routeParams: [post.id] })
  {{-- fields --}}
@end
```

## Field Components

Use field components together for accessible labels and validation errors.

`field.root` props:

| Prop | Type | Description |
| --- | --- | --- |
| `name` | `string` | Field name used for error lookup |
| `id` | `string` | Element ID used to associate labels and controls |

`field.label` props:

| Prop | Type | Description |
| --- | --- | --- |
| `text` | `string` | Label text, alternative to using the slot |

`field.error` displays validation errors for the current field name.

```edge
@field.root({ name: 'email' })
  @!field.label({ text: 'Email address' })
  @!input.control({ type: 'email', autocomplete: 'email' })
  @!field.error()
@end
```

## Input Control

Renders an input element.
Must be a child of `@field.root()`.
All props are passed as HTML attributes.

```edge
@field.root({ name: 'username' })
  @!field.label({ text: 'Username' })
  @!input.control({ type: 'text', minlength: '3', maxlength: '20' })
  @!field.error()
@end
```

## Select Control

Renders a select element.
Must be a child of `@field.root()`.

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `options` | `array` | Objects with `name` and `value` properties |

```edge
@field.root({ name: 'country' })
  @!field.label({ text: 'Country' })
  @!select.control({
    options: countries.map((country) => ({
      name: country.name,
      value: country.code,
    })),
  })
  @!field.error()
@end
```

## Textarea Control

Renders a textarea element.
Must be a child of `@field.root()`.
All props are passed as HTML attributes.

```edge
@field.root({ name: 'bio' })
  @!field.label({ text: 'Biography' })
  @!textarea.control({ rows: '4' })
  @!field.error()
@end
```

## Checkbox Components

`checkbox.group` establishes the shared field name.
`checkbox.control` must be nested within both `@checkbox.group()` and `@field.root()`.

```edge
@checkbox.group({ name: 'services' })
  @field.root({ id: 'design' })
    @!checkbox.control({ value: 'design' })
    @!field.label({ text: 'Design' })
  @end

  @field.root({ id: 'development' })
    @!checkbox.control({ value: 'development' })
    @!field.label({ text: 'Development' })
  @end
@end
```

## Radio Components

`radio.group` establishes the shared field name.
`radio.control` must be nested within both `@radio.group()` and `@field.root()`.

```edge
@radio.group({ name: 'payment_plan' })
  @field.root({ id: 'free' })
    @!radio.control({ value: 'free' })
    @!field.label({ text: 'Free' })
  @end

  @field.root({ id: 'pro' })
    @!radio.control({ value: 'pro' })
    @!field.label({ text: 'Pro' })
  @end
@end
```

## Alert Components

`alert.root` establishes context for alert title and description.

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `variant` | `string` | Alert variant, such as `destructive` or `success` |
| `autoDismiss` | `boolean` | Whether the alert dismisses automatically |

```edge
@alert.root({ variant: 'destructive', autoDismiss: true })
  @!alert.title({ text: 'Unauthorized' })
  @!alert.description({ text: 'You are not allowed to access this page' })
@end
```

## Button

Renders a button element.

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `text` | `string` | Button text, alternative to using the slot |

```edge
@!button({ text: 'Sign up', type: 'submit' })

@button({ type: 'button', class: 'btn-secondary' })
  <span>Cancel</span>
@end
```

## Link

Renders an anchor element with optional route-based URL generation.

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `text` | `string` | Link text, alternative to using the slot |
| `route` | `string` | Named route used to compute `href` |
| `routeParams` | `array` | Parameters for the named route |
| `routeOptions` | `object` | Extra URL generation options |
| `href` | `string` | Direct URL, used instead of `route` |

```edge
@!link({ route: 'posts.show', routeParams: [post.id], text: 'View post' })

@link({ route: 'posts.edit', routeParams: [post.id] })
  <span>Edit</span>
@end
```

## Avatar

Renders either an image or initials.

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `src` | `string` | Avatar image URL |
| `initials` | `string` | Fallback initials |

```edge
@!avatar({ src: user.avatarUrl, alt: user.name })
@!avatar({ initials: user.initials })
```
