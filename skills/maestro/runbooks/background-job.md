# Runbook: Background Job

Use this runbook for work that should happen outside the request cycle: queued jobs, event/listener side effects, scheduled processing, retries, notifications, exports, and long-running tasks.

## Skill Sequence

```text
maestro -> adonisjs -> lucid if job reads/writes data -> japa
```

Use a queue/domain skill if the project has one.

## Steps

1. **Intake**
   - Identify the trigger, payload, retry behavior, idempotency key, side effects, and user-visible result.
   - Decide whether this is an event/listener, queue job, command, or scheduled task.

2. **Boundary (`adonisjs`)**
   - Controllers should enqueue/emit and return quickly.
   - Listeners/jobs own side effects.
   - Services own reusable business logic.

3. **Data contract (`lucid`, if needed)**
   - Store status, attempts, logs, outbox rows, or idempotency keys.
   - Use transactions when enqueueing must happen with DB writes.

4. **Execution behavior**
   - Make jobs idempotent where retries are possible.
   - Separate recoverable failures from permanent failures.
   - Log enough context to debug without leaking secrets.

5. **Tests (`japa`)**
   - Test the request enqueues/emits.
   - Test the handler/listener service behavior directly.
   - Fake external services and verify retry/error behavior when possible.

## Gates

- [ ] Request path does not perform long-running work inline.
- [ ] Job/listener payload is small and serializable.
- [ ] Handler is idempotent or explicitly non-retriable.
- [ ] Side effects happen after successful DB writes.
- [ ] Tests cover enqueue/emit and handler behavior.

## Deeper Skills

- `adonisjs`: events, listeners, services, Ace commands, exceptions, queue integration patterns
- `lucid`: transactions, status tables, idempotency records
- `japa`: fakes, service tests, functional tests
