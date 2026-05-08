# Skills

Reusable agent skills for AdonisJS, Lucid, Inertia, Japa, and full-cycle engineering orchestration.

## Install

### Guided Installer

Use the `adonisjs-maestro` CLI to install the right skills for your stack:

```bash
npx adonisjs-maestro
```

Non-interactive examples:

```bash
npx adonisjs-maestro --stack=vue --yes
npx adonisjs-maestro --stack=react --global --agent=codex --yes
npx adonisjs-maestro --skills=maestro,adonisjs,lucid,japa --yes
```

Available stacks:

| Stack | Skills |
| --- | --- |
| `monorepo` | `maestro`, `adonisjs`, `lucid`, `japa` |
| `hypermedia` | `maestro`, `adonisjs`, `lucid`, `japa`, `edge` |
| `react` | `maestro`, `adonisjs`, `lucid`, `japa`, `inertia-react` |
| `vue` | `maestro`, `adonisjs`, `lucid`, `japa`, `inertia-vue` |
| `custom` | Choose individual skills |

### Direct Skills CLI

Install the collection with the `skills` CLI:

```bash
npx skills add lncitador/adonisjs-maestro
```

For a global install:

```bash
npx skills add lncitador/adonisjs-maestro -g --yes
```

Restart your agent after installing so the new skills are loaded.

## Skills

| Skill | Use it for |
| --- | --- |
| `maestro` | Orchestrating full-cycle app work: intake, planning, implementation, verification, commit, push, and PR |
| `adonisjs` | AdonisJS v7 backend work: migrations, models, transformers, controllers, routes, auth, policies, services, events, and review |
| `lucid` | Lucid ORM and SQL layer: migrations, schema generation, models, relationships, query builders, transactions, factories, and seeders |
| `edge` | Edge.js server-side templates in AdonisJS Hypermedia apps: layouts, components, forms, slots, and template state |
| `inertia-vue` | Vue 3 frontend patterns in AdonisJS + Inertia projects |
| `inertia-react` | React frontend patterns in AdonisJS + Inertia projects |
| `japa` | Japa testing in AdonisJS apps: API tests, browser tests, console tests, fakes, swaps, and database setup |

### In Progress

| Skill | Stack | Use it for |
| --- | --- | --- |
| `tuyau` | `api-monorepo` | Tuyau end-to-end type-safe API client: codegen, typed routes, and RPC-style calls |

## Recommended Entry Point

Use `maestro` when the task is broader than a single framework question.

```text
INTAKE -> PLANNING -> BUILD -> VERIFY -> PUBLISH -> DONE
```

Examples:

```text
/maestro plan and implement this AdonisJS + Inertia feature.
/maestro review this PR against the implementation plan.
/maestro verify, commit, push, and open a PR for this change.
```

`maestro` coordinates the other skills instead of replacing them. For example, an AdonisJS + Inertia Vue task should usually combine:

- `/maestro` for phase control and workflow gates
- `/adonisjs` for backend contracts and routing
- `/lucid` for migrations, models, relationships, query builders, and factories
- `/inertia-vue` for frontend page/form patterns
- `/japa` for test strategy and fixtures

## Direct Skill Usage

Use a specialized skill directly when the request is narrow:

```text
/adonisjs create a controller, route, and validator for posts.
/lucid create a migration, model relationship, and factory for posts.
/japa write a functional test with loginAs.
/inertia-vue fix this Form component.
/inertia-react type these generated Data props.
```

## Repository Layout

All skills live under `skills/`. Each folder contains a required `SKILL.md` file and optional resources:

```text
skills/
├── maestro/
├── adonisjs/
├── lucid/
├── edge/
├── inertia-vue/
├── inertia-react/
└── japa/
```

The framework skills include references and runbooks for deeper context. The `maestro` skill intentionally has no scripts or references: it is an orchestration layer.

## Development

Use the Skills CLI to search, install, check, and update skills:

```bash
npm run typecheck
npm run build
npx skills find adonisjs
npx skills check
npx skills update
```

Before publishing changes, make sure each skill folder contains a valid `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: Use when...
---
```

Keep optional resources (`references/`, `scripts/`, `assets/`, `agents/`) only when they directly support the skill.

## Release

Releases are created with `release-it`:

```bash
npm run release
```

The release command runs typecheck, tests, and build before bumping the package version, creating the release commit, and tagging it as `v<version>`. Pushing the tag triggers GitHub Actions to publish `adonisjs-maestro` to npm.

Configure npm Trusted Publishing for `.github/workflows/publish.yml` before the first release. The workflow uses GitHub OIDC instead of a long-lived npm token.

## Notes

- These skills assume modern AdonisJS v7 conventions.
- `lucid` is focused on the ORM/database layer and should be paired with `adonisjs` for controllers, routes, validators, services, and framework-level architecture.
- `inertia-vue` and `inertia-react` are frontend-layer skills and should be paired with `adonisjs` for backend work.
- `japa` is focused on testing patterns for AdonisJS apps.
- `maestro` should be used when a task needs orchestration, phase gates, or publishing workflow discipline.
