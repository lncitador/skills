# Runbook: Reporting Dashboard

Use this runbook for dashboards, analytics pages, aggregate reports, filtered tables, exports, and metrics views.

## Skill Sequence

```text
maestro -> lucid -> adonisjs -> inertia-* or API response -> japa
```

Use frontend skills when rendering charts/tables/forms. Use domain skills for metric definitions.

## Steps

1. **Intake**
   - Define each metric, filter, date range, grouping, freshness requirement, and expected user action.
   - Confirm whether the dashboard must be real-time, cached, deferred, or exportable.

2. **Query/data contract (`lucid`)**
   - Design aggregate queries, pagination, indexes, query builders, raw SQL, or reporting tables.
   - Avoid N+1 patterns and unbounded list queries.
   - Consider transactions or snapshots only when consistency matters.

3. **Backend contract (`adonisjs`)**
   - Use controllers/services to assemble report data.
   - Use transformers/DTOs for stable response shape.
   - Use cache, queue, or deferred loading for expensive secondary data.

4. **Frontend/API contract**
   - Inertia: type props and use deferred/optional props when suitable.
   - API: return stable JSON with metadata for filters/pagination.
   - Keep loading/empty/error states explicit.

5. **Tests (`japa`)**
   - Test metric correctness with controlled fixture data.
   - Test filters, pagination, authorization, and empty states.

## Gates

- [ ] Metric definitions are explicit and source-backed.
- [ ] Query performance was considered with `lucid`.
- [ ] Large datasets are paginated, aggregated, cached, queued, or deferred.
- [ ] Response/page prop shape is stable.
- [ ] Tests use deterministic fixture data.

## Deeper Skills

- `lucid`: aggregate queries, raw SQL, pagination, indexes, transactions
- `adonisjs`: services, transformers, cache, queue, controllers
- `inertia-*`: typed dashboard props, deferred props, forms/filters
- `japa`: deterministic fixture and response tests
