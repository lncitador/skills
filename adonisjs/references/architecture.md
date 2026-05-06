# Architecture

## Three rendering architectures

Identify which one the project uses before generating code. This determines what
the controller returns and what the frontend layer looks like.

### Hypermedia (Edge + HTMX/Unpoly)
- Server renders HTML with Edge templates
- Interactivity via HTMX or Unpoly — no SPA
- Controller returns `view.render('page', data)`
- Forms submit via normal POST
- Flash messages for user feedback

### Full-stack monolith (Inertia + React or Vue)
- AdonisJS handles all backend concerns; React/Vue handles only rendering
- Controller returns `inertia.render('Page/Index', data)` using Transformers
- No frontend routing, no isomorphic code
- See the `inertia-react` or `inertia-vue` skill for the frontend layer

### API (JSON only)
- AdonisJS serves JSON only
- Frontend lives in a separate package (Next.js, mobile, etc.)
- Controller uses `serialize(PostTransformer.transform(posts))` or `response.ok(...)`
- Access tokens guard instead of session guard

## Folder structure

```
app/
├── controllers/     # HTTP: parse → validate → authorize → respond
├── models/          # Relations + business logic (columns in schema.ts)
├── services/        # Business logic with more than 2-3 steps
├── validators/      # VineJS: one file per entity
├── transformers/    # Serialize models to JSON + generate TS types
├── middleware/      # Request interceptors
├── exceptions/      # Domain exceptions + global handler
├── events/          # Event definitions (data only)
├── listeners/       # Event reactions (side effect logic)
└── policies/        # Bouncer: authorization rules

database/
├── migrations/      # DB schema — drives schema.ts regeneration
├── schema.ts        # AUTO-GENERATED — never edit manually
├── seeders/         # Initial and development data
└── factories/       # Test data factories

start/
├── routes.ts        # All application routes
├── kernel.ts        # Named middleware registration
└── events.ts        # Listener registration per event
```

## Dependency direction

```
routes → controllers → transformers → models
                   ↘ validators
                   ↘ policies (bouncer)
                   ↘ events → listeners
```

- Controller: validates, authorizes, calls transformer, returns response
- Model file: ONLY relations, computed properties, hooks — columns in schema.ts
- Transformer: serializes models, uses `.allows()` for permission flags
- Model does NOT know: HttpContext, controllers, services
- Listener does NOT throw HTTP exceptions — catch and log internally
