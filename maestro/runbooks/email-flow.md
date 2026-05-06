# Runbook: Email Flow

Use this runbook for transactional email flows: verification, password reset, invitations, receipts, notifications, and admin-triggered email actions.

## Skill Sequence

```text
maestro -> lucid if tokens/state are persisted -> adonisjs -> japa
```

Use frontend/Inertia skills when the flow includes forms or pages.

## Steps

1. **Intake**
   - Identify trigger, recipient, template, token/signature needs, expiration, retry behavior, and user-facing confirmation.

2. **State contract (`lucid`, if needed)**
   - Persist token hashes, invitation state, sent-at timestamps, rate-limit counters, or audit rows.
   - Store hashes for reset/recovery tokens when the raw value should not be recoverable.

3. **Mail boundary (`adonisjs`)**
   - Use mail classes/templates for message content.
   - Use signed URLs for callback links when appropriate.
   - Send mail from services/listeners, not inline in bloated controllers.

4. **Routes/controllers (`adonisjs`)**
   - Public callback routes must validate signatures/tokens.
   - Mutating routes need CSRF/session or token protections based on architecture.
   - Return neutral messages for reset/invite flows to avoid account enumeration.

5. **Tests (`japa`)**
   - Fake mail.
   - Assert recipient, subject/template data, signed link behavior, expiration, invalid token behavior, and rate limiting when present.

## Gates

- [ ] Secret tokens are hashed or signed, not stored as raw recoverable values unless required.
- [ ] Callback route is public/private intentionally.
- [ ] User-facing messages do not leak account existence.
- [ ] Mail sending is tested with fakes.
- [ ] Side effects occur after successful state changes.

## Deeper Skills

- `adonisjs`: mail, signed URLs, controllers, validators, events/listeners
- `lucid`: token persistence, audit state, transactions
- `japa`: mail fakes and functional tests
