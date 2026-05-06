# Console Tests

Testing custom Ace commands.

## Basic test

```ts
import { test } from '@japa/runner'
import Greet from '#commands/greet'
import ace from '@adonisjs/core/services/ace'

test.group('Commands / greet', () => {
  test('exits with code 0', async () => {
    const command = await ace.create(Greet, [])  // second arg = CLI args array
    await command.exec()
    command.assertSucceeded()
  })
})
```

---

## Raw mode — capture logger output

By default, output goes to stdout and cannot be asserted. Switch to **raw mode** to capture in memory:

```ts
test.group('Commands / greet', (group) => {
  group.each.setup(() => {
    ace.ui.switchMode('raw')
    return () => ace.ui.switchMode('normal')  // restore after each test
  })

  test('logs greeting', async () => {
    const command = await ace.create(Greet, [])
    await command.exec()

    command.assertSucceeded()
    // Raw mode represents colors as function names
    command.assertLog('[ blue(info) ] Hello world from "Greet"')
    command.assertLogMatches(/Hello world/)  // regex variant
  })
})
```

**Color format in raw mode:**
- `this.logger.info('msg')` → `[ blue(info) ] msg`
- `this.logger.error('msg')` → `[ red(error) ] msg` (on stderr)

---

## Table output

```ts
test('displays team table', async () => {
  const command = await ace.create(ListTeam, [])
  await command.exec()

  command.assertTableRows([
    ['Harminder Virk', 'virk@adonisjs.com'],
    ['Romain Lanz', 'romain@adonisjs.com'],
  ])
})
```

---

## Trapping prompts

Prompts block test execution — must trap **before** `exec()`:

```ts
test('greets by name', async () => {
  const command = await ace.create(Greet, [])

  // Text prompt — this.prompt.ask()
  command.prompt.trap('What is your name?').replyWith('Virk')

  // Select prompt — this.prompt.choice() — zero-based index
  command.prompt.trap('Select package manager').chooseOption(0)

  // Multi-select — this.prompt.multiple()
  command.prompt.trap('Select databases').chooseOptions([0, 2])

  // Confirm — this.prompt.confirm() or toggle()
  command.prompt.trap('Delete all files?').accept()
  command.prompt.trap('Delete all files?').reject()

  await command.exec()
  command.assertSucceeded()
})
```

**Critical:** Prompt titles are **case-sensitive**. Copy exactly from the command source.
If a trap is set but the prompt never fires, Japa throws an error.

---

## Testing prompt validation

```ts
test('validates email format', async () => {
  const command = await ace.create(CreateUser, [])

  command.prompt
    .trap('Enter your email')
    .assertFails('', 'Email is required')
    .assertFails('not-valid', 'Please enter a valid email')
    .assertPasses('user@example.com')
    .replyWith('admin@adonisjs.com')  // final reply after validation tests

  await command.exec()
  command.assertSucceeded()
})
```

---

## All assertions

| Method | Description |
|---|---|
| `assertSucceeded()` | exitCode === 0 |
| `assertFailed()` | exitCode !== 0 |
| `assertExitCode(n)` | Specific exit code |
| `assertNotExitCode(n)` | Not a specific exit code |
| `assertLog(msg)` | Exact log message (raw mode) |
| `assertLog(msg, 'stderr')` | Log on stderr stream |
| `assertLogMatches(regex)` | Log matches regex (raw mode) |
| `assertTableRows([[...]])` | Table contents (raw mode) |
