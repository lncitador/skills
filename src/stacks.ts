export const SKILLS_REPOSITORY = 'lncitador/adonisjs-maestro'
export const DEFAULT_INSTALL_AGENTS = ['universal', 'claude-code'] as const

export const AVAILABLE_SKILLS = [
  'maestro',
  'adonisjs',
  'lucid',
  'japa',
  'inertia-react',
  'inertia-vue',
] as const

export type SkillName = (typeof AVAILABLE_SKILLS)[number]

export const SKILL_METADATA: Record<SkillName, { label: string; hint: string }> = {
  maestro: {
    label: 'Maestro',
    hint: 'Orchestration: intake → plan → build → verify → publish',
  },
  adonisjs: {
    label: 'AdonisJS',
    hint: 'Controllers, routes, auth, middleware, services, events',
  },
  lucid: {
    label: 'Lucid',
    hint: 'Migrations, models, relationships, query builders, factories',
  },
  japa: {
    label: 'Japa',
    hint: 'API, browser, and console tests with fakes and database setup',
  },
  'inertia-react': {
    label: 'Inertia React',
    hint: 'React frontend patterns for AdonisJS + Inertia projects',
  },
  'inertia-vue': {
    label: 'Inertia Vue',
    hint: 'Vue 3 frontend patterns for AdonisJS + Inertia projects',
  },
}

export type StackName = 'hypermedia' | 'react' | 'vue' | 'api' | 'api-monorepo' | 'custom'

export type StackDefinition = {
  name: StackName
  label: string
  hint: string
  starterKit: string | null
  skills: SkillName[]
}

export const STACKS: StackDefinition[] = [
  {
    name: 'hypermedia',
    label: 'Hypermedia app',
    hint: 'A full-stack app using server-side templates',
    starterKit: 'github:adonisjs/starter-kits/hypermedia',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa'],
  },
  {
    name: 'react',
    label: 'React app (using Inertia)',
    hint: 'A full-stack React app with end-to-end type safety',
    starterKit: 'github:adonisjs/starter-kits/inertia-react',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa', 'inertia-react'],
  },
  {
    name: 'vue',
    label: 'Vue app (using Inertia)',
    hint: 'A full-stack Vue app with end-to-end type safety',
    starterKit: 'github:adonisjs/starter-kits/inertia-vue',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa', 'inertia-vue'],
  },
  {
    name: 'api',
    label: 'API',
    hint: 'A type-safe REST API with session and access token auth',
    starterKit: 'github:adonisjs/starter-kits/api',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa'],
  },
  {
    name: 'api-monorepo',
    label: 'API (monorepo)',
    hint: 'A monorepo setup with a type-safe REST API',
    starterKit: 'github:adonisjs/starter-kits/api-monorepo',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa'],
  },
  {
    name: 'custom',
    label: 'Custom',
    hint: 'Choose individual skills',
    starterKit: null,
    skills: [],
  },
]

export function getStack(name: string) {
  return STACKS.find((stack) => stack.name === name)
}

export function parseSkills(value: string) {
  const requested = value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)

  const invalid = requested.filter((skill) => !AVAILABLE_SKILLS.includes(skill as SkillName))
  if (invalid.length > 0) {
    throw new Error(`Unknown skill(s): ${invalid.join(', ')}`)
  }

  return [...new Set(requested)] as SkillName[]
}

export function parseAgents(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((agent) => agent.trim())
        .filter(Boolean)
    ),
  ]
}

export function buildSkillsAddArgs(options: {
  skills: SkillName[]
  global?: boolean
  agents?: string[]
  yes?: boolean
}) {
  const args = ['skills', 'add', SKILLS_REPOSITORY]

  for (const skill of options.skills) {
    args.push('--skill', skill)
  }

  if (options.global) {
    args.push('--global')
  }

  for (const agent of options.agents ?? []) {
    args.push('--agent', agent)
  }

  if (options.yes) {
    args.push('--yes')
  }

  return args
}
