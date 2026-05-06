# Browser Tests

End-to-end with Playwright. Tests the full stack as a real user would.
**For Hypermedia and Inertia apps, browser tests should form the majority of your test suite.**

## Setup (already configured in Hypermedia/Inertia starter kits)

```ts
// tests/bootstrap.ts
import { browserClient } from '@japa/browser-client'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'

export const plugins = [
  assert(),
  pluginAdonisJS(app),
  browserClient({ runInSuites: ['browser'] }),  // Playwright
  sessionBrowserClient(app),                    // read/write session
  authBrowserClient(app),                       // loginAs
]

// Start HTTP server for browser suite
export const configureSuite = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

`.env.test` must have:
```dotenv
SESSION_DRIVER=memory
```

---

## CLI options

```bash
node ace test browser                   # all browser tests
node ace test browser --headed          # show the browser window
node ace test browser --browser=firefox # chromium (default), firefox, webkit
node ace test browser --slow=500        # slow down actions by 500ms
node ace test browser --devtools        # open devtools
node ace test browser --trace=onError   # record trace on failure
node ace test browser --trace=onTest    # record trace for every test

# View recorded trace
npx playwright show-trace browsers/path-to-trace.zip
```

---

## Basic page visit

```ts
import { test } from '@japa/runner'

test.group('Posts index', () => {
  test('displays list of posts', async ({ visit, route }) => {
    // route() generates URL from named route
    const page = await visit(route('posts.index'))

    // Waits up to 5s for text to appear
    await page.assertTextContains('body', 'My first post')
    await page.assertPath('/posts')
    await page.assertVisible('.post-item')
  })
})
```

---

## Database state

```ts
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Post from '#models/post'

test.group('Posts index', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('displays posts', async ({ visit, route }) => {
    // Create exactly what this test needs
    const user = await User.create({ email: 'test@test.com', password: 'secret' })
    await Post.create({ title: 'My first post', content: '...', userId: user.id })

    const page = await visit(route('posts.index'))
    await page.assertTextContains('body', 'My first post')
  })

  test('shows empty state when no posts', async ({ visit, route }) => {
    const page = await visit(route('posts.index'))
    await page.assertTextContains('body', 'No posts yet')
  })
})
```

---

## Form interactions

```ts
test('submits login form', async ({ visit, route }) => {
  const page = await visit(route('session.create'))

  // Locate by label (mirrors how users find fields)
  await page.getByLabel('Email').fill('user@test.com')
  await page.getByLabel('Password').fill('secret')

  // Click by ARIA role (resilient to markup changes)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.assertPath('/dashboard')
})
```

---

## Recording mode — generate test code automatically

```ts
test('create a new post', async ({ record, route }) => {
  // Opens browser — interact with the app, then close the browser
  // Japa prints the generated locators/actions code in the terminal
  await record(route('posts.create'))
})
// After recording: replace record() with visit() and paste generated code
```

---

## Authentication

```ts
test('accesses protected page', async ({ visit, browserContext, route }) => {
  const user = await User.create({ email: 'test@test.com', password: 'secret' })

  // Authenticate — applies to all subsequent visits in this test
  await browserContext.loginAs(user)

  const page = await visit(route('posts.create'))
  await page.assertPath('/posts/create')  // not redirected to login
})
```

---

## Cookies and sessions

```ts
// Set before visiting
await browserContext.setCookie('theme', 'dark')          // encrypted (default)
await browserContext.setPlainCookie('locale', 'en-us')   // plain
await browserContext.setEncryptedCookie('prefs', { sidebar: 'collapsed' })

await browserContext.setSession({ onboarding: { currentStep: 3 } })
await browserContext.setFlashMessages({ success: 'Your changes have been saved' })

// Read after interaction
const theme = await browserContext.getCookie('theme')
const locale = await browserContext.getPlainCookie('locale')
const prefs = await browserContext.getEncryptedCookie('prefs')
const session = await browserContext.getSession()
const flash = await browserContext.getFlashMessages()
```

---

## Common page assertions

```ts
await page.assertPath('/posts')
await page.assertTextContains('body', 'Hello')
await page.assertVisible('.alert-success')
await page.assertNotVisible('.error')
await page.assertUrl('https://example.com/posts')
```
