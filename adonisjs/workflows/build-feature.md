# Workflow: Build Feature

Mental process for decomposing and implementing any new feature in AdonisJS the right way.

**When to use:** Before writing any code for a new feature. Use as an architecture decision checklist.

---

## Phase 1 — Understand the feature

Before opening any file, answer these questions:

1. **What does the user want to do?** (use case, not technology)
2. **Who can do this?** (authenticated? specific role?)
3. **What changes in the database?** (new table, columns, relations)
4. **What are the edge cases?** (duplicate, not found, permission denied)
5. **Are there side effects?** (email, event, queue job, cache invalidation)

---

## Phase 2 — Decide the architecture

### Is it a Resource or an Action?

```
Question: does this behavior fit in the 7 CRUD methods?
  ├── YES → resourceful controller  (PostsController, CommentsController)
  └── NO  → action controller       (PublishPostController, ApproveOrderController)
```

**Examples of Actions that become their own controller:**
- "Publish post" → `PublishPostController` with `store` method
- "Approve order" → `ApproveOrderController` with `store` method
- "Resend email" → `ResendVerificationController` with `store` method

### Where does the logic go?

```
Controller → receives request, validates, calls, returns response
Service    → business logic with more than 2-3 steps
Model      → queries and relations, nothing HTTP-related
```

**Practical rule:** if you need more than 5 lines of logic in the controller beyond validation and redirect, move it to a Service.

### Does it have side effects?

```
Side effect (email, push, webhook, queue) → ALWAYS in Service or via Event
Never directly in the controller
```

---

## Phase 3 — Create files in the right order

Always follow this sequence — do not skip steps:

```
1. Migration      → defines the schema
2. Model          → defines relations and columns
3. Validator      → defines what the user can send
4. Service        → business logic (if needed)
5. Controller     → HTTP: parse → validate → call → respond
6. Routes         → register and protect
7. View/Page      → frontend (Edge or Inertia)
8. Tests          → verify the complete flow
```

**Ace commands to speed up:**
```bash
node ace make:model ModelName -m    # model + migration
node ace make:controller Name --resource
node ace make:validator name
node ace make:service NameService
node ace make:middleware NameMiddleware
node ace make:event NameEvent
node ace make:listener NameListener
```

---

## Phase 4 — Checklist before calling it done

### Security
- [ ] All routes that modify data require `middleware.auth()`
- [ ] Authorization checks if the user **can** do that (Bouncer), not just if they are logged in
- [ ] Validation with VineJS in a **separate file** — never inline in the controller
- [ ] Public read routes are separate from protected write routes

### Architecture
- [ ] Controller has at most 7 methods
- [ ] Business logic is not in the controller
- [ ] Side effects (email, event) are not in the controller
- [ ] Model does not import `HttpContext` or do redirects

### Database
- [ ] Migration has `onDelete` on all FKs
- [ ] Migration has `timestamps(true, true)`
- [ ] Indexes on most-queried columns (email, slug, user_id)

### Quality
- [ ] Tests cover the happy path
- [ ] Tests cover access denied (403) and not found (404)
- [ ] `node ace list:routes` shows routes as expected

---

## Phase 5 — Decomposing complex features

For features with many steps (e.g. checkout, onboarding), break into sub-features:

```
Feature: Checkout
├── Sub-feature: Cart          → CartController (resource)
├── Sub-feature: Address       → CheckoutAddressController (action)
├── Sub-feature: Payment       → CheckoutPaymentController (action)
├── Sub-feature: Confirmation  → OrderConfirmationController (action)
└── Service: OrderService      → orchestrates everything, fires events
```

Each sub-feature has its own controller, validator, and tests.

---

## Applied example: "User can favorite posts"

### Phase 1
- Toggle favorite/unfavorite on a post
- Requires auth
- New `post_favorites` table (user_id, post_id)
- No side effects

### Phase 2
- It is an Action: `POST /posts/:id/favorites` and `DELETE /posts/:id/favorites`
- Two controllers: `PostFavoritesController` with `store` and `destroy`
- No Service needed (simple logic)

### Result
```ts
// routes
router.post('/posts/:postId/favorites', [controllers.PostFavorites, 'store']).use(middleware.auth())
router.delete('/posts/:postId/favorites', [controllers.PostFavorites, 'destroy']).use(middleware.auth())

// controller
async store({ auth, params, response }: HttpContext) {
  await PostFavorite.firstOrCreate({
    userId: auth.user!.id,
    postId: params.postId,
  })
  return response.redirect().back()
}

async destroy({ auth, params, response }: HttpContext) {
  await PostFavorite.query()
    .where('userId', auth.user!.id)
    .where('postId', params.postId)
    .delete()
  return response.redirect().back()
}
```
