import { test } from '@japa/runner'

import {
  AVAILABLE_SKILLS,
  DEFAULT_INSTALL_AGENTS,
  buildSkillsAddArgs,
  getStack,
  parseAgents,
  parseSkills,
} from '../src/stacks.js'

test.group('stacks', () => {
  test('defines stack presets with the expected skills', ({ assert }) => {
    assert.deepEqual(getStack('hypermedia')?.skills, ['maestro', 'adonisjs', 'lucid', 'japa'])
    assert.deepEqual(getStack('api')?.skills, ['maestro', 'adonisjs', 'lucid', 'japa'])
    assert.deepEqual(getStack('api-monorepo')?.skills, ['maestro', 'adonisjs', 'lucid', 'japa'])
    assert.deepEqual(getStack('react')?.skills, [
      'maestro',
      'adonisjs',
      'lucid',
      'japa',
      'inertia-react',
    ])
    assert.deepEqual(getStack('vue')?.skills, [
      'maestro',
      'adonisjs',
      'lucid',
      'japa',
      'inertia-vue',
    ])
    assert.deepEqual(getStack('custom')?.skills, [])
    assert.isUndefined(getStack('monorepo'))
  })

  test('defines stack presets with the expected starter kits', ({ assert }) => {
    assert.equal(getStack('hypermedia')?.starterKit, 'github:adonisjs/starter-kits/hypermedia')
    assert.equal(getStack('react')?.starterKit, 'github:adonisjs/starter-kits/inertia-react')
    assert.equal(getStack('vue')?.starterKit, 'github:adonisjs/starter-kits/inertia-vue')
    assert.equal(getStack('api')?.starterKit, 'github:adonisjs/starter-kits/api')
    assert.equal(getStack('api-monorepo')?.starterKit, 'github:adonisjs/starter-kits/api-monorepo')
    assert.isNull(getStack('custom')?.starterKit)
  })

  test('parses comma-separated skills and removes duplicates', ({ assert }) => {
    assert.deepEqual(parseSkills('maestro, adonisjs,lucid,maestro'), [
      'maestro',
      'adonisjs',
      'lucid',
    ])
  })

  test('rejects unknown skills', ({ assert }) => {
    assert.throws(() => parseSkills('maestro,unknown'), 'Unknown skill(s): unknown')
  })

  test('parses comma-separated agents and removes duplicates', ({ assert }) => {
    assert.deepEqual(parseAgents('universal, claude-code,claude-code,codex'), [
      'universal',
      'claude-code',
      'codex',
    ])
  })

  test('defines non-interactive default install agents', ({ assert }) => {
    assert.deepEqual([...DEFAULT_INSTALL_AGENTS], ['universal', 'claude-code'])
  })

  test('keeps available skills in the public install order', ({ assert }) => {
    assert.deepEqual([...AVAILABLE_SKILLS], [
      'maestro',
      'adonisjs',
      'lucid',
      'japa',
      'inertia-react',
      'inertia-vue',
    ])
  })

  test('builds skills CLI arguments', ({ assert }) => {
    assert.deepEqual(
      buildSkillsAddArgs({
        skills: ['maestro', 'adonisjs', 'lucid'],
        global: true,
        agents: ['codex', 'claude-code'],
        yes: true,
      }),
      [
        'skills',
        'add',
        'lncitador/adonisjs-maestro',
        '--skill',
        'maestro',
        '--skill',
        'adonisjs',
        '--skill',
        'lucid',
        '--global',
        '--agent',
        'codex',
        '--agent',
        'claude-code',
        '--yes',
      ]
    )
  })
})
