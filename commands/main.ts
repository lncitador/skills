import { execa } from 'execa'
import { BaseCommand, flags } from '@adonisjs/ace'

import {
  AVAILABLE_SKILLS,
  STACKS,
  type SkillName,
  buildSkillsAddArgs,
  getStack,
  parseSkills,
} from '../src/stacks.js'

export class InstallSkills extends BaseCommand {
  static commandName = 'adonisjs-maestro'
  static description = 'Install AdonisJS Maestro agent skills for your stack'

  @flags.string({
    description: 'Stack preset to install: monorepo, hypermedia, react, vue, or custom',
  })
  declare stack?: string

  @flags.string({
    description: 'Comma-separated list of skills to install',
  })
  declare skills?: string

  @flags.string({
    description: 'Target agent. Repeat by comma-separating values, or use "*" for all agents',
    alias: 'a',
  })
  declare agent?: string

  @flags.boolean({
    description: 'Install globally instead of the current project',
    alias: 'g',
  })
  declare global?: boolean

  @flags.boolean({
    description: 'Skip skills CLI confirmation prompts',
    alias: 'y',
  })
  declare yes?: boolean

  @flags.boolean({
    description: 'Print the generated npx skills command without running it',
  })
  declare dryRun?: boolean

  @flags.boolean({
    description: 'Show command output from the skills CLI',
    alias: 'v',
  })
  declare verbose?: boolean

  async #promptForStack() {
    if (this.stack) {
      return this.stack
    }

    const selected = await this.prompt.choice(
      'Which AdonisJS stack are you using?',
      STACKS.map((stack) => ({
        name: stack.name,
        message: stack.label,
        hint: stack.hint,
      }))
    )

    return selected
  }

  async #promptForCustomSkills() {
    const answer = await this.prompt.ask(
      [
        'Which skills should be installed?',
        `Available: ${AVAILABLE_SKILLS.join(', ')}`,
        'Enter a comma-separated list',
      ].join('\n')
    )

    return parseSkills(answer)
  }

  #parseAgents() {
    if (!this.agent) {
      return []
    }

    return this.agent
      .split(',')
      .map((agent) => agent.trim())
      .filter(Boolean)
  }

  async #resolveSkills() {
    if (this.skills) {
      return parseSkills(this.skills)
    }

    const stackName = await this.#promptForStack()
    const stack = getStack(stackName)

    if (!stack) {
      throw new Error(`Unknown stack "${stackName}". Expected one of: ${STACKS.map((item) => item.name).join(', ')}`)
    }

    if (stack.name === 'custom') {
      return this.#promptForCustomSkills()
    }

    return stack.skills
  }

  #renderCommand(args: string[]) {
    return ['npx', ...args].join(' ')
  }

  async run() {
    const skills = await this.#resolveSkills()

    if (skills.length === 0) {
      throw new Error('No skills selected')
    }

    const args = buildSkillsAddArgs({
      skills,
      global: this.global,
      agents: this.#parseAgents(),
      yes: this.yes,
    })

    this.logger.info(`Installing skills: ${skills.join(', ')}`)
    this.logger.info(this.#renderCommand(args))

    if (this.dryRun) {
      return
    }

    await execa('npx', args, {
      stdio: this.verbose ? 'inherit' : 'pipe',
    })

    this.logger.success('AdonisJS Maestro skills installed')
  }
}
