# Runbook: File Uploads with Drive

Implements secure file upload with VineJS validation, Drive storage, and URL generation.

**When to use:** Allowing users to upload images, documents, or any file.

**Prerequisite:** `node ace add @adonisjs/drive`

---

## Step 1 — Configure Drive

`config/drive.ts` is created by the `add` command. Verify the default disk:

```ts
import { defineConfig, services } from '@adonisjs/drive'

export default defineConfig({
  default: env.get('DRIVE_DISK'),
  services: {
    fs: services.fs({
      location: app.makePath('storage'),
      serveFiles: true,
      routeBasePath: '/uploads',
      visibility: 'public',
    }),
    s3: services.s3({
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY'),
      },
      region: env.get('AWS_REGION'),
      bucket: env.get('S3_BUCKET'),
      visibility: 'public',
    }),
  },
})
```

`.env`:
```
DRIVE_DISK=fs   # switch to s3 in production
```

---

## Step 2 — Validators with file validation

`app/validators/upload.ts`:

```ts
import vine from '@vinejs/vine'

// Avatar image (1 file, 2MB max, images only)
export const avatarUploadValidator = vine.create(
  vine.object({
    avatar: vine.file({
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    }),
  })
)

// Document (PDF or Word, 10MB)
export const documentUploadValidator = vine.create(
  vine.object({
    document: vine.file({
      size: '10mb',
      extnames: ['pdf', 'doc', 'docx'],
    }),
    title: vine.string().trim().maxLength(255),
  })
)

// Multiple files
export const galleryUploadValidator = vine.create(
  vine.object({
    images: vine.array(
      vine.file({
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })
    ).maxLength(10),
  })
)
```

---

## Step 3 — Upload Service

`app/services/upload_service.ts`:

```ts
import { inject } from '@adonisjs/core'
import drive from '@adonisjs/drive/services/main'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { cuid } from '@adonisjs/core/helpers'

@inject()
export default class UploadService {
  async upload(file: MultipartFile, folder: string): Promise<string> {
    const fileName = `${folder}/${cuid()}.${file.extname}`
    await file.moveToDisk(fileName)
    return fileName
  }

  async getUrl(key: string): Promise<string> {
    return drive.use().getUrl(key)
  }

  // Signed URL (temporary, for private files)
  async getSignedUrl(key: string, expiresIn = '15 minutes'): Promise<string> {
    return drive.use().getSignedUrl(key, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    try {
      await drive.use().delete(key)
    } catch {
      // File may not exist, ignore
    }
  }

  // Replace file — deletes the old one before saving the new one
  async replace(oldKey: string | null, file: MultipartFile, folder: string): Promise<string> {
    if (oldKey) {
      await this.delete(oldKey)
    }
    return this.upload(file, folder)
  }
}
```

---

## Step 4 — Migration with file column

```ts
// Add to the model's migration that receives the upload
table.string('avatar_path').nullable()  // stores the Drive "key"
```

---

## Step 5 — Controller

`app/controllers/avatar_controller.ts`:

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import UploadService from '#services/upload_service'
import { avatarUploadValidator } from '#validators/upload'

@inject()
export default class AvatarController {
  constructor(private uploadService: UploadService) {}

  async update({ request, auth, response }: HttpContext) {
    const { avatar } = await request.validateUsing(avatarUploadValidator)
    const user = auth.user!

    // Replace previous avatar if it exists
    const key = await this.uploadService.replace(user.avatarPath, avatar, 'avatars')

    user.avatarPath = key
    await user.save()

    return response.redirect().back()
  }

  async destroy({ auth, response }: HttpContext) {
    const user = auth.user!
    if (user.avatarPath) {
      await this.uploadService.delete(user.avatarPath)
      user.avatarPath = null
      await user.save()
    }
    return response.redirect().back()
  }
}
```

**Controller with multiple files:**

```ts
async store({ request, auth, response }: HttpContext) {
  const { images, title } = await request.validateUsing(galleryUploadValidator)

  const keys = await Promise.all(
    images.map((img) => this.uploadService.upload(img, `galleries/${auth.user!.id}`))
  )

  await Gallery.create({ userId: auth.user!.id, title, imagePaths: keys })
  return response.redirect().toRoute('galleries.index')
}
```

---

## Step 6 — Expose URL in the controller

Store the key in the DB, generate the URL when passing to the view:

```ts
async show({ inertia, params, auth }: HttpContext) {
  const user = await User.findOrFail(auth.user!.id)

  const avatarUrl = user.avatarPath
    ? await drive.use().getUrl(user.avatarPath)
    : null

  return inertia.render('profile/edit', { user, avatarUrl })
}
```

---

## Step 7 — Routes

```ts
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'

router
  .put('/account/avatar', [controllers.Avatar, 'update'])
  .as('avatar.update')
  .use(middleware.auth())

router
  .delete('/account/avatar', [controllers.Avatar, 'destroy'])
  .as('avatar.destroy')
  .use(middleware.auth())
```

---

## Step 8 — Frontend (Inertia + React)

```tsx
export default function EditProfile() {
  const { post, processing } = useForm({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    post('/account/avatar', { data, forceFormData: true })
  }

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <input type="file" name="avatar" accept="image/*" />
      <button disabled={processing}>Save</button>
    </form>
  )
}
```

---

## Step 9 — Tests

```ts
test('uploads valid avatar', async ({ client, assert }) => {
  const user = await UserFactory.create()

  const response = await client
    .put('/account/avatar')
    .loginAs(user)
    .file('avatar', Buffer.from('fake-image'), { filename: 'avatar.jpg', contentType: 'image/jpeg' })

  response.assertStatus(302)
  await user.refresh()
  assert.isNotNull(user.avatarPath)
})

test('rejects file that is too large', async ({ client }) => {
  const user = await UserFactory.create()
  const bigFile = Buffer.alloc(3 * 1024 * 1024) // 3MB

  const response = await client
    .put('/account/avatar')
    .loginAs(user)
    .file('avatar', bigFile, { filename: 'big.jpg', contentType: 'image/jpeg' })

  response.assertStatus(422)
})
```

---

## Final checklist

- [ ] Drive configured with correct disk (fs dev, s3 prod)
- [ ] Validator in separate file with `vine.file()` — size and extensions
- [ ] UploadService encapsulates all Drive logic
- [ ] When updating, delete the previous file (`replace`)
- [ ] Key stored in DB, not the URL (URL generated dynamically)
- [ ] URL resolved in the controller before passing to the view
- [ ] Form with `encType="multipart/form-data"` and `forceFormData: true` in Inertia
- [ ] Tests cover valid upload and invalid file rejection
