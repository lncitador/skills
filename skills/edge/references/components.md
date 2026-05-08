# Components

Edge components are server-rendered template fragments for reusable UI.
They are not reactive frontend components and they do not bundle CSS or client-side JavaScript.

Use components when a fragment needs explicit props, slots, layout composition, or nested component state.
Use partials for simple markup includes.

## Location and Tag Names

In AdonisJS apps, place components under `resources/views/components`.
Files in that directory can be rendered as tags.

| Template path | Tag |
| --- | --- |
| `components/button.edge` | `@button()` |
| `components/form/input.edge` | `@form.input()` |
| `components/modal/index.edge` | `@modal()` |
| `components/tool_tip.edge` | `@toolTip()` |

Components can also be rendered with the explicit `@component()` tag.
Prefer component tags for local app components because they are clearer.

```edge
@!component('components/button', { text: 'Save' })
@!button({ text: 'Save' })
```

Use `@!tag()` for components without a body.
Use `@tag() ... @end` when the component accepts slots.

## Props

Pass props as an object.
Inside the component, props are available by name and through `$props`.

```edge
{{-- resources/views/components/button.edge --}}
<button type="{{ type || 'submit' }}">
  {{ text }}
</button>
```

```edge
@!button({ text: 'Login' })
@!button({ text: 'Cancel', type: 'reset' })
```

For HTML-element wrapper components, prefer forwarding unknown attributes with `$props.toAttrs()`.

```edge
{{-- resources/views/components/input.edge --}}
<input {{ $props.merge({ type: 'text', class: ['input'] }).toAttrs() }} />
```

```edge
@!input({
  name: 'title',
  id: 'title',
  class: ['input-lg'],
})
```

Useful `$props` methods:

| Method | Use |
| --- | --- |
| `has(key)` | Check whether a prop exists |
| `get(key)` | Read a prop by name |
| `only(keys)` | Keep only selected props |
| `except(keys)` | Remove selected props |
| `merge(values)` | Merge defaults with caller props taking priority |
| `mergeIf(condition, values)` | Merge defaults only when condition is true |
| `mergeUnless(condition, values)` | Merge defaults unless condition is true |
| `toAttrs()` | Serialize props into HTML attributes |

Use `except()` when a prop controls component behavior but should not become an HTML attribute.

```edge
<input {{
  $props
    .mergeUnless(removeExistingStyles, { class: ['input'] })
    .except(['removeExistingStyles'])
    .toAttrs()
}} />
```

## Slots

Slots are named outlets provided between a component's opening and closing tags.
Render slot content through `$slots`.

```edge
{{-- resources/views/components/card.edge --}}
<div {{ $props.merge({ class: ['card'] }).toAttrs() }}>
  <header>
    {{{ await $slots.header() }}}
  </header>

  <section>
    {{{ await $slots.main() }}}
  </section>
</div>
```

```edge
@card({ class: ['card-lg'] })
  @slot('header')
    <strong>Quick start</strong>
  @end

  <p>Start building your next project in minutes</p>
@end
```

Use `$slots.main()` for the default unnamed content.
Use named slots when a component has multiple content regions.

Slot content can access the parent template state.
It cannot automatically access variables local to the component.
Pass data to a slot by calling the slot function with an object.

```edge
{{-- inside component --}}
{{{ await $slots.footer({ size: 'medium' }) }}}
```

```edge
@slot('footer', componentState)
  <span>{{ componentState.size }}</span>
@end
```

## Layout Components

Layouts are regular components, usually stored under `resources/views/components/layout`.
They render the HTML document shell and expose slots for page content and metadata.

```edge
{{-- resources/views/components/layout/app.edge --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{ title || 'My App' }}</title>

  @if($slots.meta)
    {{{ await $slots.meta() }}}
  @end
</head>
<body>
  {{{ await $slots.main() }}}
</body>
</html>
```

```edge
@layout.app({ title: 'Posts' })
  @slot('meta')
    <meta name="description" content="Latest posts" />
  @end

  <main>
    <h1>Posts</h1>
  </main>
@end
```

Keep document-level concerns in layout components.
Keep page-specific queries and state in controllers before rendering.

## Provide and Inject

Use `@inject` and `$context` when a parent component must share state with deeply nested child components without passing props through every layer.
Use it sparingly; props and slots are easier to trace for most components.

Call `@inject` before rendering or evaluating child slots.

```edge
{{-- resources/views/components/menu/index.edge --}}
@let(menu = {
  activeItem: activeItem,
  items: [],
})

@inject({ menu })

<nav>
  {{{ await $slots.main() }}}
</nav>
```

Child components can read the injected state through `$context`.

```edge
{{-- resources/views/components/menu/item.edge --}}
@if(!$context.menu)
  @newError(
    'The menu.item component should be nested within the menu component',
    $caller.filename,
    $caller.line,
    $caller.col
  )
@end

<a
  href="{{ href }}"
  aria-current="{{ $context.menu.activeItem === name ? 'page' : false }}"
>
  {{ label }}
</a>
```

Prefer provide/inject for tightly coupled component families such as `menu` / `menu.item`, `tabs` / `tabs.panel`, or `field.root` / input controls.
Do not use it as a replacement for controller state or general application globals.

## Review Checklist

- Component files live under `resources/views/components`.
- Props are explicit and behavior-only props are excluded from `toAttrs()`.
- Wrapper components forward HTML attributes with `$props.toAttrs()` or `$props.merge(...).toAttrs()`.
- Slot output is awaited and rendered unescaped because it is already template-rendered HTML.
- Layouts own document shell and page-level slots.
- Provide/inject is limited to tightly coupled component trees.
