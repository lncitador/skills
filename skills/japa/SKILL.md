---
name: japa
description: >
  Use this skill whenever the user is writing, debugging, or configuring tests in an AdonisJS application with Japa. Trigger for any testing task: writing API tests, browser tests (Playwright), console/command tests, database state setup, test doubles (fakes, swaps, time), factory usage, or any question about the testing layer. Also trigger for "write a test", "how to test", "fake the mailer", "loginAs", "truncate database", "withGlobalTransaction", "emitter.fake", "hash.fake", "drive.fake", "swap container", "freeze time", "timeTravel", "useFake", "raw mode", "record mode", or any Japa-specific concept. For AdonisJS backend patterns used inside tests (models, factories, auth) use the adonisjs skill alongside this one.
---

# Japa Testing Skill

AdonisJS uses [Japa](https://japa.dev) — a backend testing framework built and maintained by the AdonisJS team. Unlike Jest/Vitest, Japa runs natively in Node.js without transpilers and has plugins specifically designed for backend testing.

---

## Suites and structure

```
tests/
├── bootstrap.ts          # plugins, hooks, suite config
├── unit/                 # fast in-process tests
└── browser/              # end-to-end with Playwright
```

Suites defined in `adonisrc.ts`:

```ts
tests: {
  suites: [
    { files: ['tests/unit/**/*.spec.ts'], name: 'unit', timeout: 2000 },
    { files: ['tests/browser/**/*.spec.ts'], name: 'browser', timeout: 300000 },
  ],
  forceExit: false,
}
```

---

## bootstrap.ts

**Hypermedia/Inertia starter kits** (browser + unit suites):

```ts
import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import { browserClient } from '@japa/browser-client'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'

export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  browserClient({ runInSuites: ['browser'] }),
  sessionBrowserClient(app),
  authBrowserClient(app),
]

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [() => testUtils.db().migrate()],
  teardown: [],
}

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

**API starter kit** (adds apiClient plugins):

```ts
import { apiClient } from '@japa/api-client'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
]
```

**.env.test** — always required for auth in tests:
```dotenv
SESSION_DRIVER=memory
```

---

## Running tests

```bash
node ace test                           # all suites
node ace test unit                      # specific suite
node ace test browser

node ace test --files="posts/index"     # specific file
node ace test --files="posts/*"         # folder wildcard
node ace test --tests="can list posts"  # exact test title
node ace test --groups="Posts index"    # group name

node ace test --watch                   # re-run on change
node ace test --bail                    # stop on first failure
node ace test --failed                  # re-run only failed tests
```

---

## Database state — between each test

Choose one approach per group:

```ts
// Global transactions (faster — rolls back, nothing persisted)
group.each.setup(() => testUtils.db().withGlobalTransaction())

// Truncation (actual delete — slower but more compatible)
group.each.setup(() => testUtils.db().truncate())
```

Run migrations once before all tests in bootstrap.ts:
```ts
runnerHooks.setup = [
  () => testUtils.db().migrate(),
  () => testUtils.db().seed(),  // optional
]
```

Multiple connections:
```ts
() => testUtils.db().migrate()
() => testUtils.db('tenant').migrate()
```

---

## References

| Topic | File |
|---|---|
| API tests — client.visit(), assertions, auth | references/api-tests.md |
| Browser tests — Playwright, forms, loginAs, cookies | references/browser-tests.md |
| Console tests — Ace commands, raw mode, prompts | references/console-tests.md |
| Test doubles — fakes, swaps, time, sinon | references/test-doubles.md |

---

## Runbooks

| Feature | File |
|---|---|
| Full test suite for a CRUD resource | runbooks/resource-tests.md |

---

## Anti-Patterns

| Wrong | Correct |
|---|---|
| No DB cleanup between tests | `withGlobalTransaction()` or `truncate()` in `group.each.setup` |
| `SESSION_DRIVER` not set to `memory` | Required in `.env.test` for `loginAs` to work |
| Using fakes without `using` or `.restore()` | `using fake = mail.fake()` for auto-restore |
| `sinon.restore()` in `group.each.setup` | `sinon.restore()` in `group.each.teardown` |
| `redis.flushdb()` in `group.each.setup` | In `group.each.teardown` (clear after, not before) |
| Mocking DB queries | Hit the real test DB — mocks miss constraint errors |
| `record()` in committed test | Only for generating code — replace with `visit()` |
| Prompt trap without exact title match | Titles are case-sensitive — copy exactly from command |
