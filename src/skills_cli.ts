export type SkillsCliResult = {
  failed: boolean
  exitCode?: number
  signal?: string
}

export function getSkillsCliFailureExitCode(result: SkillsCliResult) {
  if (!result.failed) {
    return undefined
  }

  if (result.signal === 'SIGINT') {
    return 130
  }

  return result.exitCode ?? 1
}
