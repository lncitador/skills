export const SKILLS_REPOSITORY = 'lncitador/adonisjs-maestro'

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

export type StackName = 'monorepo' | 'hypermedia' | 'react' | 'vue' | 'custom'

export type StackDefinition = {
  name: StackName
  label: string
  hint: string
  skills: SkillName[]
}

export const STACKS: StackDefinition[] = [
  {
    name: 'monorepo',
    label: 'Monorepo: API + TanStack',
    hint: 'API/backend workflow without Inertia frontend skills',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa'],
  },
  {
    name: 'hypermedia',
    label: 'Hypermedia',
    hint: 'Server-rendered or hypermedia-oriented AdonisJS app',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa'],
  },
  {
    name: 'react',
    label: 'Fullstack: Inertia React',
    hint: 'AdonisJS + Lucid + Inertia React',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa', 'inertia-react'],
  },
  {
    name: 'vue',
    label: 'Fullstack: Inertia Vue',
    hint: 'AdonisJS + Lucid + Inertia Vue',
    skills: ['maestro', 'adonisjs', 'lucid', 'japa', 'inertia-vue'],
  },
  {
    name: 'custom',
    label: 'Custom',
    hint: 'Choose individual skills',
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
