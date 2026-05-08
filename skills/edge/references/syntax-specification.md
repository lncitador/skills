# Syntax Specification

Edge keeps template syntax close to JavaScript.
Use curly braces for JavaScript expressions and `@` tags for template features such as conditionals, loops, partials, components, and debugging.

## Curly Braces

Use `{{ }}` to evaluate a JavaScript expression and append the escaped output to the rendered string.

```edge
Hello {{ username }}!
```

Expressions may span multiple lines, but each delimiter must stay intact.

```edge
Hello {{
  users.map((user) => {
    return user.username
  }).join(', ')
}}
```

Use `{{{ }}}` or `html.safe()` only for trusted HTML.

```edge
{{{ post.content }}}
```

Escape frontend-framework curly braces with `@{{ }}` when Edge must leave them untouched.

```edge
Edge should not parse @{{ username }}
```

## Edge Tags

Tags start with `@` followed by the tag name.
A tag must be written on its own line with no markup around it.
Use curly braces for same-line JavaScript inside markup.

```edge
@if(user)
  <p>Hello {{ user.username }}</p>
@end
```

Invalid:

```edge
@if(user) <p>Hello</p> @end
```

Valid:

```edge
@if(user)
  <p>Hello</p>
@end
```

## Block Tags

Block-level tags have content and close with `@end`.

```edge
@if(someCondition)
  Content
@end
```

When a block-level component has no body, prefix the tag with `!` to auto-close it.
Do not put whitespace between `@!` and the tag name.

```edge
@!button({ text: 'Save', type: 'submit' })
```

For multiline arguments, keep the tag call together.

```edge
@!component(
  'button',
  {
    type: 'primary',
  }
)
```

## Inline Tags

Inline tags do not accept a body and do not need `@end`.

```edge
@include('partials/header')
```

If a tag accepts arguments, call it like a function.
Tags without arguments, such as `@debugger`, may be written without parentheses.

```edge
@debugger
```

## Swallowing Newlines

Tags usually create a newline separator between text blocks.
Append `~` when a tag should not produce a newline in text-sensitive output.

```edge
Hello
@let(username = 'virk')~
 {{ username }}
```

Output:

```txt
Hello virk
```

Use this sparingly. In normal HTML templates, prefer readable block structure.

## Comments

Use Edge comments for template-only notes.
They are not rendered to the final output.

```edge
{{-- Inline comment --}}

{{--
  Multi-line comment.
--}}
```

Keep comments short and useful.
Prefer removing stale commented-out markup instead of hiding it in Edge comments.
