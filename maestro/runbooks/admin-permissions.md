# Runbook: Admin Permissions

Use this runbook for roles, permissions, ownership checks, admin panels, protected actions, policy-backed UI flags, and role-specific navigation.

## Skill Sequence

```text
maestro -> lucid if roles/permissions are persisted -> adonisjs -> inertia-* if UI changes -> japa
```

Use domain skills for business-specific permission semantics.

## Steps

1. **Intake**
   - Identify actors, resources, actions, ownership rules, role hierarchy, and whether permissions are static or persisted.

2. **Data contract (`lucid`, if needed)**
   - Model roles, permissions, pivots, ownership fields, seed data, and factories.
   - Keep permission data normalized enough to test and audit.

3. **Authorization (`adonisjs`)**
   - Implement Bouncer policies for resource checks.
   - Use middleware for broad area access.
   - Use `.authorize()` in controllers and `.allows()` for boolean UI/transformer flags.

4. **Frontend (`inertia-vue` or `inertia-react`, if needed)**
   - Hide actions using permission flags but never rely only on UI hiding.
   - Keep disabled/hidden states consistent with backend policy.

5. **Tests (`japa`)**
   - Test allowed and denied actors.
   - Test direct route access, not only UI visibility.
   - Use factories for role/permission setup.

## Gates

- [ ] Every protected mutation has a server-side authorization check.
- [ ] Policy names/actions match the domain language.
- [ ] UI permission flags are derived from backend authorization.
- [ ] Tests cover owner, non-owner, admin, and anonymous/unauthorized cases where relevant.
- [ ] Seeded roles/permissions are deterministic.

## Deeper Skills

- `adonisjs`: Bouncer, middleware, controllers, transformers
- `lucid`: role/permission schema, pivots, factories, seeders
- `inertia-*`: UI flags and protected action controls
- `japa`: auth/authorization tests
