# Runbook: Inertia Resource

Use this runbook for a complete AdonisJS + Inertia resource: persisted data, controller, transformer, typed props, page, form, redirects, SPA navigation, and tests.

## Skill Sequence

```text
maestro -> lucid -> adonisjs -> inertia-vue or inertia-react -> japa
```

Use the Vue or React Inertia skill that matches the project.

## Steps

1. **Intake**
   - Identify the resource, user workflow, rendering mode, auth/permission rules, and affected app/package.
   - Stop at planning if the user is still shaping the feature.

2. **Data contract (`lucid`)**
   - Define tables, schema generation, model relationships, scopes, factories, and seed data.
   - Do not move to frontend until the backend prop shape is clear.

3. **Backend contract (`adonisjs`)**
   - Create validators, controller/actions, routes, policies, services, and transformers.
   - Keep fixed routes before dynamic routes.
   - Use redirects after mutations.

4. **Frontend (`inertia-vue` or `inertia-react`)**
   - Type page props from generated `Data.*`.
   - Use AdonisJS Inertia wrappers for `Form` and `Link`.
   - Preserve SPA navigation and error bags.

5. **Tests (`japa`)**
   - Cover route access, validation, authorization, successful mutation, redirect behavior, and rendered props.
   - Add browser tests when form/navigation behavior is user-critical.

## Gates

- [ ] Data contract exists before typed frontend props are written.
- [ ] Controllers do not contain multi-step business logic.
- [ ] Transformers do not issue queries.
- [ ] Inertia links/forms use route-name helpers where available.
- [ ] Tests cover at least one successful write and one failed validation/authorization path.

## Deeper Skills

- `lucid`: migrations, models, relationships, factories, query builders
- `adonisjs`: controllers, validators, routes, transformers, policies
- `inertia-vue` / `inertia-react`: pages, forms, links, typed props
- `japa`: API/browser tests
