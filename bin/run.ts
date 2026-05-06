#!/usr/bin/env node

import { kernel } from '../index.js'

kernel.handle(['adonisjs-maestro', ...process.argv.slice(2)]).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
