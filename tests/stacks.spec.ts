import { test } from '@japa/runner'

import {
  AVAILABLE_SKILLS,
  buildSkillsAddArgs,
  getStack,
  parseSkills,
} from '../src/stacks.js'

test.group('stacks', () => {
  test('defines stack presets with the expected skills', ({ assert }) => {
    assert.deepEqual(getStack('monorepo')?.skills, ['maestro', 'adonisjs', 'lucid', 'japa'])
    assert.deepEqual(getStack('hypermedia')?.skills, ['maestro', 'adonisjs', 'lucid', 'japa'])
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
        'lncitador/skills',
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
