# Loops

Use `@each` to loop over arrays and objects in Edge templates.
Its behavior is similar to JavaScript `for...of` iteration.

## Arrays

Loop over array items with `@each(item in items)`.

```edge
@each(user in users)
  <li>{{ user.username }}</li>
@end
```

Access the array index by wrapping the item and index in parentheses.

```edge
@each((user, index) in users)
  <li>{{ index + 1 }} {{ user.username }}</li>
@end
```

## Objects

Loop over object entries with the same `@each` tag.
The first parameter is the value and the second parameter is the key.

```ts
await view.render('recipes', {
  food: {
    ketchup: '5 tbsp',
    mustard: '1 tbsp',
    pickle: '0 tbsp',
  },
})
```

```edge
@each((amount, ingredient) in food)
  <li>Use {{ amount }} of {{ ingredient }}</li>
@end
```

## Fallback Content

Use `@else` inside `@each` to render fallback content when the value is an empty array, empty object, or `undefined`.

```edge
@each(comment in post.comments)
  @include('partials/comment')
@else
  <p>This post has not received any comments</p>
@end
```

Prefer `@each ... @else` over a separate length check when the only goal is empty-state rendering.
