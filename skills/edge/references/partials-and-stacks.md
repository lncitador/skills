# Partials and Stacks

Use partials for reusable markup fragments.
Use stacks when partials or components need to push content into a named placeholder owned by a layout.

## Partials

Partials are templates included inside another template with `@include`.
They have access to the data available to the parent template, including inline variables.

```edge
@include('partials/header')

<main>
  Page content
</main>

@include('partials/footer')
```

Use partials for plain markup reuse.
For reusable UI with props, slots, or behavior, prefer Edge components under `resources/views/components`.

## Conditional Partials

Use `@includeIf(condition, template)` when a partial should render only if a condition is true.

```edge
@includeIf(post.comments.length, 'partials/comments')
```

Prefer `@includeIf` for small conditional includes.
Use a normal `@if` block when the condition needs an `@else` fallback or when the branch is easier to read expanded.

## Stacks

Stacks create named placeholders that other templates can push content into.
They are useful in layouts when nested templates/components need to add scripts, styles, or other page-level fragments.

```edge
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  @stack('scripts')
</head>
<body>
  {{{ await $slots.main() }}}
</body>
</html>
```

Push content into a stack from a page, partial, or component.

```edge
@pushTo('scripts')
  <script type="module" src="/assets/posts.js"></script>
@end
```

## Push Variants

Use the stack push variant that matches ordering and duplication requirements.

| Tag | Behavior |
| --- | --- |
| `@pushTo` | Append content to the stack every time |
| `@pushToTop` | Prepend content to the stack every time |
| `@pushOnceTo` | Append content once even if rendered multiple times |
| `@pushOnceToTop` | Prepend content once even if rendered multiple times |

Use `@pushOnceTo` or `@pushOnceToTop` for component-level scripts that should not be duplicated when the component appears multiple times.

```edge
<dialog x-data="postDialog"></dialog>

@pushOnceTo('scripts')
  <script>
    Alpine.data('postDialog', function () {
      return {
        show() {},
        hide() {},
      }
    })
  </script>
@end
```

## AdonisJS Guidance

- Keep page shells in layout components.
- Use partials for small reusable fragments that do not need props or slots.
- Use components when the fragment needs explicit inputs, slots, or composition.
- Use stacks sparingly for page-level assets or fragments that must render outside the local template position.
- Prefer Vite/imported assets for application JavaScript. Use stacks for template-specific scripts or progressive enhancement fragments.
