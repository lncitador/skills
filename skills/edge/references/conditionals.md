# Conditionals

Use `@if`, `@elseif`, and `@else` to render conditional blocks in Edge templates.
Their behavior mirrors JavaScript `if/else` statements.

```edge
@if(user)
  <p>{{ user.username }}</p>
@end
```

```edge
@if(user.fullName)
  <p>Hello {{ user.fullName }}!</p>
@elseif(user.firstName)
  <p>Hello {{ user.firstName }}!</p>
@else
  <p>Hello Guest!</p>
@end
```

## Unless

Use `@unless` for "not if" conditions when it improves readability.

```edge
@if(!account.isActive)
  <p>Please verify your email address to activate the account</p>
@end
```

```edge
@unless(account.isActive)
  <p>Please verify your email address to activate the account</p>
@end
```

Prefer `@unless(condition)` over `@if(!condition)` only when the condition stays simple.
For compound negated conditions, use `@if` with a named boolean from controller state or a clearer positive condition.

## Inline Conditionals

Use JavaScript ternary expressions for small inline branches.

```edge
<input
  class="input {{ hasError ? 'error' : '' }}"
/>
```

Keep ternaries short. If the expression controls full markup blocks or repeats complex checks, use `@if` / `@elseif` / `@else` instead.
