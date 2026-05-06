# Validations

## Fundamental rule

Never validate inline in controllers. Always use separate files in `app/validators/`.

## vine.create() vs vine.compile()

The official docs use `vine.create()` for creating validators:

```ts
// app/validators/post.ts
import vine from '@vinejs/vine'

export const createPostValidator = vine.create({
  title: vine.string().minLength(3).maxLength(255),
  url: vine.string().url(),
  summary: vine.string().minLength(80).maxLength(500),
})
```

In controller: `const payload = await request.validateUsing(createPostValidator)`

## Reusing validators (clone schema)

```ts
import vine from '@vinejs/vine'

export const createPostValidator = vine.create({
  title: vine.string().minLength(3).maxLength(255),
  url: vine.string().url(),
  summary: vine.string().minLength(80).maxLength(500),
})

// Clone to reuse the same rules for update
export const updatePostValidator = vine.create(
  createPostValidator.schema.clone()
)
```

## Field types — quick reference

```ts
// Strings
vine.string()
vine.string().trim()
vine.string().minLength(3).maxLength(255)
vine.string().email().normalizeEmail()
vine.string().url()
vine.string().regex(/^[a-z]+$/)
vine.string().uuid()
vine.string().in(['active', 'inactive', 'banned'])

// Numbers
vine.number()
vine.number().positive()
vine.number().min(1).max(100)
vine.number().decimal([0, 2])

// Booleans
vine.boolean()
vine.boolean().optional()

// Dates
vine.date()
vine.date({ formats: ['DD/MM/YYYY', 'YYYY-MM-DD'] })
vine.date().afterOrEqual('today')
vine.date().before(vine.ref('endDate'))

// Files
vine.file({ size: '2mb', extnames: ['jpg', 'png', 'webp'] })

// Arrays
vine.array(vine.string())
vine.array(vine.number()).minLength(1).maxLength(20)
vine.array(vine.object({ id: vine.number(), quantity: vine.number().positive() }))

// Nested objects
vine.object({
  address: vine.object({
    street: vine.string().trim(),
    city: vine.string().trim(),
    zip: vine.string().regex(/^\d{8}$/)
  })
})

// Enum
vine.enum(Object.values(PostStatus))
```

## Optional vs Nullable

```ts
vine.string().optional()            // field may be absent from request
vine.string().nullable()            // field may be explicit null
vine.string().optional().nullable() // both
```

## DB-aware validation (unique, exists)

```ts
import vine from '@vinejs/vine'
import { VineLucid } from '@adonisjs/lucid/vine'

export const createUserValidator = vine.create({
  email: vine.string().email().normalizeEmail()
    .use(VineLucid.unique({ table: 'users', column: 'email' })),

  categoryId: vine.number()
    .use(VineLucid.exists({ table: 'categories', column: 'id' })),
})

// For updates — ignore own record in unique check
export const updateUserValidator = (userId: number) =>
  vine.create({
    email: vine.string().email()
      .use(VineLucid.unique({
        table: 'users',
        column: 'email',
        whereNot: { id: userId },
      })),
  })
```

## Password confirmation

```ts
vine.object({
  password: vine.string().minLength(8),
  passwordConfirmation: vine.string().confirmed('password'),
  // form field name: password_confirmation (auto snake_case)
})
```

## Custom messages

```ts
const payload = await request.validateUsing(validator, {
  messagesProvider: vine.messagesProvider({
    'title.required': 'Title is required',
    'title.minLength': 'Title must be at least {{ min }} characters',
  })
})
```
