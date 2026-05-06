# Ace Commands

## Create a command

```bash
node ace make:command SendReminders
```

## Base structure

```ts
// commands/send_reminders.ts
import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { inject } from '@adonisjs/core'
import NotificationService from '#services/notification_service'

export default class SendReminders extends BaseCommand {
  static commandName = 'reminders:send'
  static description = 'Send reminders to users with overdue tasks'

  static options: CommandOptions = {
    startApp: true,  // initializes the full app (DB, services, etc.)
  }

  // Required positional argument
  @args.string({ description: 'Reminder type' })
  declare type: string

  // Optional argument
  @args.string({ description: 'User ID', required: false })
  declare userId: string | undefined

  // Boolean flag
  @flags.boolean({ alias: 'd', description: 'Dry run mode (do not actually send)' })
  declare dryRun: boolean

  // Value flag
  @flags.number({ description: 'Max users to process', default: 100 })
  declare limit: number

  // Dependency injection works in commands with @inject()
  @inject()
  async run(notificationService: NotificationService) {
    this.logger.info(`Sending reminders of type: ${this.type}`)

    const users = await User.query()
      .whereHas('tasks', q => q.where('due_date', '<', new Date()))
      .limit(this.limit)

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] ${users.length} users would be notified`)
      return
    }

    const progressBar = this.logger.createProgressBar({ total: users.length })
    progressBar.start()

    for (const user of users) {
      await notificationService.sendReminder(user, this.type)
      progressBar.increment()
    }

    progressBar.finish()
    this.logger.success(`${users.length} reminders sent`)
  }
}
```

## Register the command

```ts
// adonisrc.ts
commands: [
  () => import('#commands/send_reminders'),
  () => import('#commands/cleanup_expired_tokens'),
],
```

## Logger

```ts
this.logger.info('Processing...')
this.logger.success('Done!')
this.logger.warning('Some items were skipped')
this.logger.error('Failed to process')

// Structured logging
this.logger.info({ userId: user.id, type: this.type }, 'Notification sent')

// Table
this.logger.table({
  head: ['ID', 'Email', 'Status'],
  rows: users.map(u => [u.id, u.email, 'sent']),
})
```

## Interactive prompts

```ts
// Confirm destructive action
const confirmed = await this.prompt.confirm(
  `Are you sure you want to delete ${count} records?`
)
if (!confirmed) return this.logger.info('Cancelled.')

// Text input
const name = await this.prompt.ask('Environment name', {
  validate: (value) => value.length > 0 || 'Name is required',
})

// Selection
const env = await this.prompt.choice('Environment', ['development', 'staging', 'production'])

// Password (masked)
const password = await this.prompt.secure('Database password')
```

## Exit with error code

```ts
async run() {
  try {
    await this.processAll()
    this.exitCode = 0
  } catch (error) {
    this.logger.error(error.message)
    this.exitCode = 1  // causes process to exit with code 1
  }
}
```

## Run another command from within a command

```ts
await this.kernel.call('migration:run', [], { force: true })
```

## Checklist

- [ ] `startApp: true` when DB, models, or services are needed
- [ ] `@inject()` to inject services
- [ ] `--dry-run` flag on destructive or mass-send commands
- [ ] `this.prompt.confirm()` before irreversible actions
- [ ] `this.exitCode = 1` on error (CI/CD detects failure)
- [ ] Registered in `adonisrc.ts` with lazy import
- [ ] Structured logging with `this.logger.info({ ... })`
