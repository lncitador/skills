# Runbook: Two-Factor Authentication (TOTP)

Implements 2FA with TOTP (Google Authenticator, Authy), recovery codes, and middleware guard.

**When to use:** Adding 2FA to a project that already has basic auth working.

**Prerequisites:** Auth runbook already implemented. Install: `npm install otplib qrcode`

---

## Step 1 — Migration

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'totp_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').unique()
      table.string('secret').notNullable()        // encrypted TOTP secret
      table.boolean('verified').defaultTo(false)  // confirmed by user
      table.json('recovery_codes').nullable()     // hashed recovery codes
      table.timestamps(true, true)
    })

    this.schema.alterTable('users', (table) => {
      table.boolean('two_factor_enabled').defaultTo(false)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.alterTable('users', (table) => {
      table.dropColumn('two_factor_enabled')
    })
  }
}
```

---

## Step 2 — TotpConfig model

```ts
// app/models/totp_config.ts
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class TotpConfig extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column({ serializeAs: null })
  declare secret: string

  @column()
  declare verified: boolean

  @column({ serializeAs: null })
  declare recoveryCodes: string[] | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

Add to the `User` model:

```ts
@column()
declare twoFactorEnabled: boolean

@hasOne(() => TotpConfig)
declare totpConfig: HasOne<typeof TotpConfig>
```

---

## Step 3 — TOTP Service

`app/services/totp_service.ts`:

```ts
import { inject } from '@adonisjs/core'
import encryption from '@adonisjs/core/services/encryption'
import hash from '@adonisjs/core/services/hash'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import string from '@adonisjs/core/helpers/string'
import User from '#models/user'
import TotpConfig from '#models/totp_config'

@inject()
export default class TotpService {
  async generateSetup(user: User) {
    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(user.email, 'MyApp', secret)
    const qrCode = await QRCode.toDataURL(otpauth)

    // Store encrypted secret (not verified yet)
    await TotpConfig.updateOrCreate(
      { userId: user.id },
      { secret: encryption.encrypt(secret), verified: false }
    )

    return { qrCode, secret }
  }

  async verifyAndActivate(user: User, code: string): Promise<string[] | false> {
    const config = await TotpConfig.findByOrFail('userId', user.id)
    const secret = encryption.decrypt(config.secret) as string

    const isValid = authenticator.verify({ token: code, secret })
    if (!isValid) return false

    // Generate 10 single-use recovery codes
    const plainCodes = Array.from({ length: 10 }, () => string.generateRandom(10))
    const hashedCodes = await Promise.all(plainCodes.map((c) => hash.make(c)))

    config.verified = true
    config.recoveryCodes = hashedCodes
    await config.save()

    user.twoFactorEnabled = true
    await user.save()

    // Return plain codes — show to user ONCE
    return plainCodes
  }

  async verifyCode(user: User, code: string): Promise<boolean> {
    const config = await TotpConfig.findBy('userId', user.id)
    if (!config?.verified) return false

    const secret = encryption.decrypt(config.secret) as string
    return authenticator.verify({ token: code, secret })
  }

  async useRecoveryCode(user: User, code: string): Promise<boolean> {
    const config = await TotpConfig.findByOrFail('userId', user.id)
    if (!config.recoveryCodes) return false

    let usedIndex = -1
    for (let i = 0; i < config.recoveryCodes.length; i++) {
      if (await hash.verify(config.recoveryCodes[i], code)) {
        usedIndex = i
        break
      }
    }

    if (usedIndex === -1) return false

    // Remove the used code
    config.recoveryCodes = config.recoveryCodes.filter((_, i) => i !== usedIndex)
    await config.save()
    return true
  }

  async disable(user: User) {
    await TotpConfig.query().where('userId', user.id).delete()
    user.twoFactorEnabled = false
    await user.save()
  }
}
```

---

## Step 4 — Controllers

### app/controllers/two_factor_setup_controller.ts

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import TotpService from '#services/totp_service'

@inject()
export default class TwoFactorSetupController {
  constructor(private totpService: TotpService) {}

  async create({ inertia, auth }: HttpContext) {
    const { qrCode, secret } = await this.totpService.generateSetup(auth.user!)
    return inertia.render('two_factor/setup', { qrCode, secret })
  }

  async store({ request, auth, inertia, response }: HttpContext) {
    const { code } = request.only(['code'])
    const result = await this.totpService.verifyAndActivate(auth.user!, code)

    if (!result) {
      return response.redirect().back()
    }

    // result is the recovery codes — show ONCE to the user
    return inertia.render('two_factor/recovery_codes', { codes: result })
  }

  async destroy({ auth, response }: HttpContext) {
    await this.totpService.disable(auth.user!)
    return response.redirect().toRoute('dashboard')
  }
}
```

### app/controllers/two_factor_challenge_controller.ts

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import TotpService from '#services/totp_service'

@inject()
export default class TwoFactorChallengeController {
  constructor(private totpService: TotpService) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('two_factor/challenge')
  }

  async store({ request, auth, session, response }: HttpContext) {
    const { code, recoveryCode } = request.only(['code', 'recoveryCode'])
    const user = auth.user!
    let valid = false

    if (recoveryCode) {
      valid = await this.totpService.useRecoveryCode(user, recoveryCode)
    } else {
      valid = await this.totpService.verifyCode(user, code)
    }

    if (!valid) {
      return response.redirect().back()
    }

    session.put('two_factor_verified', true)
    return response.redirect().toRoute('dashboard')
  }
}
```

---

## Step 5 — 2FA Guard Middleware

`app/middleware/two_factor_middleware.ts`:

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class TwoFactorMiddleware {
  async handle({ auth, session, response }: HttpContext, next: NextFn) {
    const user = auth.user

    if (user?.twoFactorEnabled && !session.get('two_factor_verified')) {
      return response.redirect().toRoute('two_factor.challenge')
    }

    return next()
  }
}
```

Register in `start/kernel.ts`:
```ts
export const middleware = router.named({
  // ... others
  twoFactor: () => import('#middleware/two_factor_middleware'),
})
```

---

## Step 6 — Routes

```ts
// 2FA setup — requires auth
router.group(() => {
  router.get('/two-factor/setup', [controllers.TwoFactorSetup, 'create']).as('two_factor.setup')
  router.post('/two-factor/setup', [controllers.TwoFactorSetup, 'store']).as('two_factor.setup.store')
  router.delete('/two-factor', [controllers.TwoFactorSetup, 'destroy']).as('two_factor.disable')
}).use(middleware.auth())

// 2FA challenge — requires auth but NOT 2FA verified
router.get('/two-factor/challenge', [controllers.TwoFactorChallenge, 'create']).as('two_factor.challenge').use(middleware.auth())
router.post('/two-factor/challenge', [controllers.TwoFactorChallenge, 'store']).as('two_factor.challenge.store').use(middleware.auth())

// Routes protected with 2FA
router.group(() => {
  router.get('/dashboard', [controllers.Dashboard, 'index'])
  // ... other protected routes
}).use([middleware.auth(), middleware.twoFactor()])
```

---

## Final checklist

- [ ] Migration creates `totp_configs` and adds `two_factor_enabled` to `users`
- [ ] TOTP secret stored **encrypted** with `encryption`
- [ ] Recovery codes stored as **hashes** with `hash.make()`
- [ ] Recovery codes shown to the user **only once**
- [ ] Used recovery code is removed from the list (single-use)
- [ ] `TwoFactorMiddleware` applied on protected routes
- [ ] Challenge route is public with regard to 2FA but requires auth
- [ ] Setup routes do NOT use the 2FA middleware (allow disabling even without verifying)
- [ ] Destroy session when resetting/disabling 2FA
