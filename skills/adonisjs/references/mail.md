# Mail

## send vs sendLater

```ts
import mail from '@adonisjs/mail/services/main'

// send() — synchronous, blocks until delivered
await mail.send((message) => { ... })

// sendLater() — queues the email, does not block the request
await mail.sendLater((message) => { ... })
```

**Rule:** always use `sendLater()` in controllers and listeners. Use `send()` only in scripts/commands where you need to wait for delivery.

## Message API

```ts
await mail.sendLater((message) => {
  message.to('user@example.com', 'User Name')
  message.cc('cc@example.com')
  message.bcc('bcc@example.com')
  message.replyTo('support@myapp.com')
  message.from('noreply@myapp.com', 'My App')
  message.subject('Your order has been confirmed')

  // Edge template (preferred)
  message.htmlView('emails/order_confirmation', { order, user })
  message.textView('emails/order_confirmation_text', { order, user })

  // Inline HTML (for simple templates)
  message.html('<h1>Hello</h1>')
  message.text('Plain text fallback')

  // Attachment
  message.attach(app.makePath('storage/invoice.pdf'), {
    filename: 'invoice.pdf',
    contentType: 'application/pdf',
  })
})
```

## Mail Classes — for complex emails

```bash
node ace make:mail OrderConfirmation
```

```ts
// app/mails/order_confirmation.ts
import { BaseMail } from '@adonisjs/mail'
import Order from '#models/order'
import User from '#models/user'

export default class OrderConfirmationMail extends BaseMail {
  subject = 'Order confirmed'
  from = 'noreply@myapp.com'

  constructor(
    private order: Order,
    private user: User,
  ) {
    super()
  }

  prepare(message) {
    message
      .to(this.user.email, this.user.fullName)
      .htmlView('emails/order_confirmation', {
        order: this.order,
        user: this.user,
      })
  }
}

// Usage
await mail.sendLater(new OrderConfirmationMail(order, user))
```

## Email templates (Edge)

```
resources/views/emails/
├── order_confirmation.edge       ← HTML
└── order_confirmation_text.edge  ← plain text fallback
```

```html
{{-- resources/views/emails/order_confirmation.edge --}}
<!DOCTYPE html>
<html>
<body>
  <h1>Order #{{ order.id }} confirmed!</h1>
  <p>Hi {{ user.fullName }},</p>
  <a href="{{ urlFor('orders.show', { id: order.id }) }}">View order</a>
</body>
</html>
```

## Configuration per environment

```ts
// config/mail.ts
default: env.get('MAIL_MAILER', 'smtp'),

mailers: {
  smtp: transports.smtp({
    host: env.get('SMTP_HOST'),
    port: env.get('SMTP_PORT'),
    auth: { user: env.get('SMTP_USERNAME'), pass: env.get('SMTP_PASSWORD') },
  }),
  resend: transports.resend({
    key: env.get('RESEND_API_KEY'),
  }),
}
```

**.env dev** — use Mailpit to capture emails locally:
```
MAIL_MAILER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
```

## Testing mail

```ts
import mail from '@adonisjs/mail/services/main'

test('sends welcome email', async ({ client }) => {
  const mailer = mail.fake()

  await client.post('/signup').json({ ... })

  mailer.assertSent(WelcomeMail)
  mailer.assertSent(WelcomeMail, (m) => m.hasTo('user@test.com'))
  mailer.assertNotSent(OrderConfirmationMail)

  mail.restore()
})
```

## Checklist

- [ ] `sendLater()` in controllers and listeners — never `send()`
- [ ] Complex emails use Mail Classes, not inline callbacks
- [ ] Separate `.edge` template for HTML and plain text
- [ ] Dev uses Mailpit/Mailtrap — never send real emails in dev
- [ ] `mail.fake()` in tests — never send for real during tests
- [ ] `from` address always set — never leave it empty
