---
name: maestro
description: >
  Use when a feature, bugfix, review, planning, implementation, verification, commit, push, or PR task needs orchestration across multiple project skills. Maestro is the entry point for full-cycle engineering work: classify the request, choose the right domain/framework skills, enforce planning/build/publish gates, and carry the task from intake to done without replacing the specialized skills it coordinates.
---

# Maestro

Maestro is the orchestration skill. Use it first when the task needs more than a single framework answer: planning, implementing, reviewing, verifying, or publishing work across an application codebase.

```text
INTAKE -> PLANNING -> BUILD -> VERIFY -> PUBLISH -> DONE
```

If the user is still planning, stop in PLANNING. If the user asks to implement, continue through VERIFY. If the user asks for commit, push, or PR, continue through DONE.

## Role

Maestro is not a replacement for framework/domain skills. It decides which skills are needed, when to load them, and which phase gate applies.

Use specialized skills for their owned areas:

| Skill | Responsibility |
| --- | --- |
| `adonisjs` | AdonisJS backend: migrations, models, transformers, controllers, routes, redirects, auth, policies |
| `lucid` | Lucid ORM/database layer: migrations, schema generation, models, relationships, query builders, transactions, factories, seeders |
| `inertia-react` | React frontend layer in AdonisJS + Inertia projects |
| `inertia-vue` | Vue frontend layer in AdonisJS + Inertia projects |
| `japa` | Japa tests: API, browser, console, fakes, database setup |
| Project/domain skills | Business rules, repo-specific workflows, local conventions |

When a repo provides project guides such as `CLAUDE.md`, `AGENTS.md`, `README.md`, or domain skills, read the relevant guide before editing code.

## Runbooks

Use these runbooks for complete feature flows that cross multiple skills:

| Feature | File | Typical skill sequence |
| --- | --- | --- |
| Auth — signup, login, email verification, rate limiting | `runbooks/auth.md` | `maestro` -> `lucid` -> `adonisjs` -> `japa` |
| Full CRUD resource | `runbooks/crud.md` | `maestro` -> `lucid` -> `adonisjs` -> `inertia-*` -> `japa` |
| File uploads with Drive | `runbooks/file-upload.md` | `maestro` -> `adonisjs` -> `lucid` -> `inertia-*` -> `japa` |
| Two-Factor Authentication (TOTP + recovery codes) | `runbooks/two-factor-auth.md` | `maestro` -> `lucid` -> `adonisjs` -> `japa` |
| Inertia resource with typed pages/forms | `runbooks/inertia-resource.md` | `maestro` -> `lucid` -> `adonisjs` -> `inertia-*` -> `japa` |
| JSON API endpoint | `runbooks/api-endpoint.md` | `maestro` -> `lucid` as needed -> `adonisjs` -> `japa` |
| Background job, event, or queued side effect | `runbooks/background-job.md` | `maestro` -> `adonisjs` -> `lucid` as needed -> `japa` |
| Transactional email flow | `runbooks/email-flow.md` | `maestro` -> `lucid` as needed -> `adonisjs` -> `japa` |
| Admin permissions and policy-backed UI | `runbooks/admin-permissions.md` | `maestro` -> `lucid` -> `adonisjs` -> `inertia-*` -> `japa` |
| Reporting dashboard or aggregate view | `runbooks/reporting-dashboard.md` | `maestro` -> `lucid` -> `adonisjs` -> `inertia-*` or API -> `japa` |

Do not treat runbooks as a replacement for specialized skills. A runbook defines the orchestration path; each skill owns its technical details.

## Phase 1: Intake

Classify the request:

| Type | Meaning | Stop point |
| --- | --- | --- |
| Planning only | Brainstorm, spec, issue text, task breakdown, plan review | PLANNING |
| Build | Implement feature or bugfix | VERIFY |
| Review | Inspect code, PR, or changes against a plan | DONE after findings |
| Publish | Commit, push, PR, release note | DONE |

Start by understanding the worktree and project boundaries:

```bash
git status --short --branch
rg --files -g 'CLAUDE.md' -g 'AGENTS.md' -g 'README.md' -g 'package.json'
```

Identify:

- Which app/package is touched
- Whether the user is asking for planning, implementation, review, or publish
- Which framework/domain skills apply
- Whether there are unrelated local changes to preserve

Before any edit, state the execution plan in the conversation. This is mandatory regardless of task size: one-line fix, copy change, test update, generated-type issue, or full feature all require a stated plan first.

## Phase 2: Planning

Gate: a clear plan or task boundary must exist before BUILD.

NEVER edit files before stating the plan. Do not treat "small", "obvious", or "quick" tasks as exceptions. If the plan changes after inspection, state the revised plan before continuing.

```text
IF a plan was provided:
  read it and execute against it

ELSE IF the task is ambiguous, recurring, risky, or broad:
  brainstorm first
  write a plan
  wait for approval if the user is still shaping the work

ELSE:
  state a short plan before editing
```

For recurring bugs, do not patch immediately. Re-open hypotheses, inspect prior attempts if available, and write the plan first.

Use durable plan files when the repo already has a planning convention, for example:

```text
docs/superpowers/plans/YYYY-MM-DD-<feature>.md
```

## Phase 3: Build

Load the specialized skills before editing the area they own. Keep changes inside the owning app/package unless the plan explicitly crosses boundaries.

For AdonisJS + Inertia work, respect the backend-to-frontend typing dependency:

```text
lucid: migration -> schema generation -> model relationships
  -> adonisjs: transformer.toObject() -> controller: inertia.render('page', { data })
  -> generated Data.* types
    -> inertia-react/inertia-vue: typed props
      -> UI components and forms
```

If the task touches generated AdonisJS client/types (`.adonisjs`, `@generated/*`, `#generated/*`, `Data.*`, `InferPageProps`, Tuyau routes, controller imports), use the codegen protocol below before editing frontend code or generated-contract imports.

### AdonisJS Codegen Protocol

`.adonisjs` is generated output. NEVER edit `.adonisjs/**`, `@generated/*`, or `#generated/*` to fix types, routes, controllers, or data contracts. Fix the source files that produce the generated output, then run the dev server/codegen path until `.adonisjs` updates.

Mandatory sequence:

1. State the plan.
2. Identify which source change should generate the needed output: transformer, controller, route, middleware, model, config, or Tuyau/Inertia source.
3. Check whether the relevant AdonisJS dev server is already running.
4. If it is not running, start it as a long-running job before depending on generated files. Discover the command from the touched app's `package.json` or docs; common examples are `node ace serve --hmr`, `pnpm dev`, `pnpm --filter <app> dev`, or the repo-specific dev script.
5. Keep the dev job running while backend contracts, transformers, controllers, routes, or Inertia props are changing.
6. Wait for successful codegen/reload output before importing or typing against regenerated files.
7. If `.adonisjs` still does not update, debug the dev server/codegen error. Do not patch generated files by hand.
8. Before DONE, report the dev job status: already running, started and still running, stopped, or blocked.

When subagents/background workers are explicitly requested, assign one background worker to the dev job/codegen watch only. Its job is to keep the server alive, surface reload/codegen errors, and confirm regeneration. It must not edit source files.

Default build order:

1. Data contract: migration -> schema generation -> model -> relationships
2. Backend contract: transformer -> controller -> routes
3. Frontend contract: page props -> forms -> navigation -> UI components
4. Tests: focused unit/functional tests first, browser tests when UI behavior matters

Before editing UI, run this checklist:

- Match the existing UI language and conventions in the touched app.
- Reuse existing layout, spacing, form, table, modal, navigation, and empty-state patterns.
- Match the existing component library and local wrappers before adding new UI primitives.
- Match existing copy tone, labels, validation messages, and action naming.
- Preserve existing responsive behavior and interaction patterns unless the plan explicitly changes them.
- Confirm data-bound UI uses generated/current backend types instead of hand-written guesses.

Parallelize only when the user explicitly asks for subagents or parallel work, and only after dependencies are clear.

Do not:

- Edit before stating a plan
- Edit `.adonisjs/**`, `@generated/*`, or `#generated/*`
- Use `git add .` or `git add -A`
- Broaden the task beyond the request
- Implement while the user is still asking for planning
- Revert unrelated worktree changes

## Phase 4: Verify

Run the narrowest meaningful checks first, then broader checks when shared behavior changed.

Common examples:

```bash
pnpm --filter <app> typecheck
pnpm --filter <app> test
pnpm --filter <app> build
```

For Inertia navigation, verify SPA behavior when relevant: requests should use Inertia navigation rather than full page reloads.

If broad commands fail because of unrelated pre-existing issues, run focused commands that prove the touched behavior and report the unrelated debt clearly.

## Phase 5: Publish

Publish only when the user asks for commit, push, PR, or the original request includes that destination.

Before committing:

```bash
git status --short
git diff --check -- <explicit-paths>
git log --oneline -5
```

Stage explicit paths only:

```bash
git add <path-1> <path-2>
git commit -m "<type>(<scope>): <summary>"
```

For PRs:

- Confirm the target branch from the user request or live PR context
- Use the repository's established branch and PR conventions
- Include summary plus exact validation commands run
- Do not merge or delete branches unless explicitly asked

## Phase 6: Done

Before declaring completion:

- Re-read the user request or plan and confirm the scope was met
- Confirm the verification output from commands actually run
- Report skipped or blocked checks explicitly
- Keep the final status concise: changed files, validation, PR/issue link if created

## When Not To Use

Do not use Maestro for a narrow standalone question that clearly belongs to one skill only, such as "what is the correct Japa syntax for `loginAs`?" Use the specific skill directly.
