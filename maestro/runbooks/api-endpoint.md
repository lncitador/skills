# Runbook: API Endpoint

Use this runbook for JSON endpoints without Inertia: authenticated APIs, public APIs, webhooks, mobile endpoints, and integration endpoints.

## Skill Sequence

```text
maestro -> lucid if persisted data changes -> adonisjs -> japa
```

Use project/domain skills when endpoint behavior depends on business rules.

## Steps

1. **Intake**
   - Identify consumer, method, route, auth guard, payload, response shape, status codes, and error format.
   - Confirm whether this is session-based, token-based, webhook, or public.

2. **Data contract (`lucid`, if needed)**
   - Define or inspect tables, models, relationships, transactions, factories, and query behavior.
   - Use transactions for multi-write operations.

3. **Request contract (`adonisjs`)**
   - Create route and validator.
   - Use middleware for auth, rate limiting, body parsing, or signature verification.
   - Keep controller thin and move domain logic to a service.

4. **Response contract (`adonisjs`)**
   - Use transformers or explicit response DTOs.
   - Return precise status codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`.
   - Avoid leaking internal exception messages.

5. **Tests (`japa`)**
   - Cover auth, validation failure, success, not found/forbidden, idempotency/conflict when relevant, and response JSON shape.

## Gates

- [ ] Route appears in `node ace list:routes`.
- [ ] Validator exists for user input.
- [ ] Auth/rate/signature middleware matches the endpoint type.
- [ ] Response shape is stable and tested.
- [ ] Errors map to expected status codes.

## Deeper Skills

- `adonisjs`: routing, middleware, validators, controllers, transformers, exceptions
- `lucid`: data access, transactions, factories
- `japa`: API client tests
