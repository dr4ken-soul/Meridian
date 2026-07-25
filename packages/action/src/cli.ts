#!/usr/bin/env node
import { Command } from 'commander'
import { markBaseline } from './commands/mark-baseline.js'
import { listBaselines } from './commands/list-baselines.js'
import { printDiff } from './commands/diff.js'
import { comment } from './commands/comment.js'
import { promote } from './commands/promote.js'
import { status } from './commands/status.js'
const program = new Command().name('meridian').description('Replay every prompt change against what already worked.').version('0.1.0')
program.command('mark-baseline').requiredOption('--trace-id <id>').action(({ traceId }) => markBaseline(traceId))
program.command('list-baselines').action(() => listBaselines())
program.command('diff').requiredOption('--baseline <id>').requiredOption('--replay <id>').action(({ baseline, replay }) => printDiff(baseline, replay))
program.command('comment').requiredOption('--baseline <id>').requiredOption('--replay <id>').action(({ baseline, replay }) => comment(baseline, replay))
program.command('promote').requiredOption('--trace-id <id>').action(({ traceId }) => promote(traceId))
program.command('status').action(() => status())
program.parseAsync().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
