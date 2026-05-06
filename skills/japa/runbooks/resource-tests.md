# Runbook: Full Test Suite for a Resource

Complete test suite for a CRUD resource (e.g. Posts) — both browser and API patterns.

---

## Step 1 — Create test files

```bash
# Browser tests (Hypermedia / Inertia)
node ace make:test posts/index --suite=browser
node ace make:test posts/create --suite=browser
node ace make:test posts/edit --suite=browser

# API tests (JSON API)
node ace make:test posts/index --suite=unit
node ace make:test posts/create --suite=unit
```

---

## Step 2 — Shared setup in every group

```ts
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Posts index', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  // or: group.each.setup(() => testUtils.db().withGlobalTransaction())
})
```

---

## Step 3 — Browser test patterns

### List page

```ts
test.group('Posts index', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('displays posts', async ({ visit, route }) => {
    const user = await UserFactory.create()
    await PostFactory.merge({ userId: user.id }).createMany(3)

    const page = await visit(route('posts.index'))
    await page.assertTextContains('body', 'My first post')
  })

  test('shows empty state', async ({ visit, route }) => {
    const page = await visit(route('posts.index'))
    await page.assertTextContains('body', 'No posts yet')
  })
})
```

### Create form

```ts
test.group('Posts create', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('redirects guests to login', async ({ visit, route }) => {
    const page = await visit(route('posts.create'))
    await page.assertPath('/login')
  })

  test('shows validation errors', async ({ visit, browserContext, route }) => {
    await browserContext.loginAs(await UserFactory.create())

    const page = await visit(route('posts.create'))
    await page.getByRole('button', { name: 'Publish' }).click()
    await page.assertVisible('[data-invalid]')
  })

  test('creates post and redirects', async ({ visit, browserContext, route }) => {
    await browserContext.loginAs(await UserFactory.create())

    const page = await visit(route('posts.create'))
    await page.getByLabel('Title').fill('My new post')
    await page.getByLabel('URL').fill('https://example.com')
    await page.getByLabel('Summary').fill('A summary long enough to pass validation requirements in this form.')
    await page.getByRole('button', { name: 'Publish' }).click()

    await page.assertPath('/posts')
    await page.assertTextContains('body', 'My new post')
  })
})
```

### Authorization

```ts
test.group('Posts edit', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('returns 403 for another user post', async ({ visit, browserContext, route }) => {
    const owner = await UserFactory.create()
    const other = await UserFactory.create()
    const post = await PostFactory.merge({ userId: owner.id }).create()

    await browserContext.loginAs(other)

    const page = await visit(route('posts.edit', [{ id: post.id }]))
    await page.assertStatus(403)
  })
})
```

---

## Step 4 — API test patterns

```ts
test.group('Posts API', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /posts returns list', async ({ client }) => {
    await PostFactory.createMany(3)
    const response = await client.visit('posts.index')
    response.assertStatus(200)
    response.assertBodyContains({ data: [] })
  })

  test('POST /posts requires auth', async ({ client }) => {
    const response = await client.visit('posts.store').json({ title: 'Test' })
    response.assertStatus(401)
  })

  test('POST /posts returns 422 on validation error', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.visit('posts.store').loginAs(user).json({})
    response.assertStatus(422)
    response.assertBodyContains({
      errors: [{ field: 'title', rule: 'required' }],
    })
  })

  test('POST /posts creates post', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client.visit('posts.store').loginAs(user).json({
      title: 'My post',
      url: 'https://example.com',
      summary: 'A long enough summary for the validation rules to pass here.',
    })
    response.assertStatus(200)
    response.assertBodyContains({ data: { title: 'My post' } })

    // Verify DB side effect
    const post = await Post.findByOrFail('title', 'My post')
    assert.equal(post.userId, user.id)
  })

  test('PUT /posts/:id blocks non-owner', async ({ client }) => {
    const owner = await UserFactory.create()
    const other = await UserFactory.create()
    const post = await PostFactory.merge({ userId: owner.id }).create()

    const response = await client.visit('posts.update', [{ id: post.id }])
      .loginAs(other)
      .json({ title: 'Hacked' })

    response.assertStatus(403)
  })
})
```

---

## Step 5 — Side effects with fakes

```ts
test('emits PostPublished event', async ({ client }) => {
  using fakeEmitter = emitter.fake()

  const user = await UserFactory.create()
  await client.visit('posts.store').loginAs(user).json({ ... })

  fakeEmitter.assertEmitted(events.PostPublished)
})

test('sends notification email', async ({ client }) => {
  using fakeMail = mail.fake()

  await client.visit('posts.store').loginAs(user).json({ ... })

  fakeMail.mails.assertQueued(PostPublishedMail)
})
```

---

## Checklist

- [ ] `truncate()` or `withGlobalTransaction()` in every group
- [ ] Test happy path — feature working as expected
- [ ] Test guest access — redirects to login
- [ ] Test authorization — 403 for another user's resource
- [ ] Test validation — errors shown, API returns 422
- [ ] Verify DB side effect, not just HTTP status
- [ ] Use fakes for external side effects (mail, events, drive)
- [ ] Factories for all required related models
