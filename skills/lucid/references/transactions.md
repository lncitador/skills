# Transactions

Use this reference when multiple database operations must commit or roll back together, when using row locks, savepoints, isolation levels, or when passing a transaction through model/query code.

## Mental Model

Transactions group multiple database operations into one atomic unit. Every operation inside the transaction commits together or rolls back together.

Prefer managed transactions because they automatically commit when the callback returns and roll back when it throws.

## Managed Transactions

```ts
import db from '@adonisjs/lucid/services/db'

await db.transaction(async (trx) => {
  const [order] = await trx
    .table('orders')
    .insert({ status: 'pending' })
    .returning(['id'])

  await trx.table('audit_logs').insert({
    order_id: order.id,
    action: 'created',
  })
})
```

Return values from the callback become the resolved value of `db.transaction`.

```ts
const user = await db.transaction(async (trx) => {
  const [createdUser] = await trx.table('users').insert(payload).returning(['id'])
  await trx.table('profiles').insert({ user_id: createdUser.id })
  return createdUser
})
```

## Manual Transactions

Use manual transactions only when the transaction lifetime must cross function boundaries or needs custom control flow.

```ts
const trx = await db.transaction()

try {
  await trx.table('orders').insert(payload)
  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}
```

Always call `commit` or `rollback`. Leaking an open transaction can hold a database connection until the pool reclaims it.

## Isolation Levels

Pass the isolation level as the second argument to a managed transaction or when creating a manual transaction:

```ts
await db.transaction(async (trx) => {
  // queries using trx
}, { isolationLevel: 'serializable' })

const trx = await db.transaction({ isolationLevel: 'serializable' })
```

Common values:

- `read committed`: common default; only committed data is visible.
- `repeatable read`: same rows stay stable during the transaction; PostgreSQL may raise serialization errors that should be retried.
- `serializable`: strictest option; useful for operations that must prevent concurrent interleaving.

SQLite has a different locking model; setting an isolation level there has no useful effect.

## Query Builder Transactions

Build queries from the transaction client:

```ts
await db.transaction(async (trx) => {
  await trx.from('orders').where('id', orderId).update({ status: 'paid' })
  await trx.from('inventory').where('product_id', productId).decrement('stock')
})
```

Or pass the transaction as a query client:

```ts
await db.transaction(async (trx) => {
  await db
    .query({ client: trx })
    .from('users')
    .where('id', userId)
    .update({ is_active: true })
})
```

## Model Transactions

Attach transactions to model queries:

```ts
await db.transaction(async (trx) => {
  const user = await User.findOrFail(userId, { client: trx })
  user.status = 'active'
  await user.save()
})
```

Attach transactions to new model instances:

```ts
await db.transaction(async (trx) => {
  const user = new User()
  user.email = 'user@example.com'
  user.useTransaction(trx)
  await user.save()
})
```

When a model instance is loaded through `{ client: trx }`, subsequent `save` and relationship operations stay inside the transaction.

Use `Model.transaction` when the operation is scoped to one model, especially if the model uses a custom connection:

```ts
await User.transaction(async (trx) => {
  const user = new User()
  user.useTransaction(trx)
  await user.save()
})
```

## Relationship Writes

When a parent model has `$trx` set, relationship writes inherit the transaction:

```ts
await db.transaction(async (trx) => {
  const user = new User()
  user.email = 'user@example.com'
  user.useTransaction(trx)
  await user.save()

  await user.related('profile').create({ fullName: 'Ada Lovelace' })
})
```

## Savepoints

Calling `transaction()` on an existing transaction client creates a savepoint:

```ts
const trx = await db.transaction()
const savepoint = await trx.transaction()

try {
  await savepoint.table('audit_logs').insert({ action: 'login' })
  await savepoint.commit()
} catch (error) {
  await savepoint.rollback()
}

await trx.commit()
```

Rolling back the savepoint keeps the outer transaction alive.

## Row Locks

Use `forUpdate` inside a transaction to serialize critical writes:

```ts
await db.transaction(async (trx) => {
  const wallet = await Wallet
    .query({ client: trx })
    .where('userId', userId)
    .forUpdate()
    .firstOrFail()

  wallet.balance -= amount
  await wallet.save()
})
```

Use locks for balance updates, stock decrements with business checks, queue claiming, or anything where two concurrent transactions could otherwise read the same state and both write invalid results.

## After Commit

When side effects must run only after a successful commit, use transaction events/hooks rather than firing external work before the commit is guaranteed.

Examples:

- Send an email only after user creation commits.
- Dispatch a job only after an order and its audit rows commit.
- Publish a domain event only after all DB writes succeed.

## Deeper Docs

- Transactions: https://lucid.adonisjs.com/docs/transactions
- Database service: https://lucid.adonisjs.com/docs/database-service
- Model query builder: https://lucid.adonisjs.com/docs/model-query-builder
