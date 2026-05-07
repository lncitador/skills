import { test } from '@japa/runner'

import { getSkillsCliFailureExitCode } from '../src/skills_cli.js'

test.group('skills cli', () => {
  test('uses the child exit code when the skills CLI fails', ({ assert }) => {
    assert.equal(getSkillsCliFailureExitCode({ failed: true, exitCode: 1 }), 1)
  })

  test('maps SIGINT to the conventional interrupted exit code', ({ assert }) => {
    assert.equal(getSkillsCliFailureExitCode({ failed: true, signal: 'SIGINT' }), 130)
  })

  test('does not return an exit code for successful runs', ({ assert }) => {
    assert.isUndefined(getSkillsCliFailureExitCode({ failed: false }))
  })
})
