#!/usr/bin/env bun

/**
 * 🕐 Shift Commits Outside Business Hours
 *
 * Rewrites git commit timestamps to appear outside business hours (Mountain Time).
 * Designed for side projects to maintain clear work/personal boundaries.
 *
 * Usage:
 *   bun run scripts/shift-commits.ts                    # Dry-run (preview changes)
 *   bun run scripts/shift-commits.ts --execute          # Apply changes
 *   bun run scripts/shift-commits.ts --range HEAD~5     # Specific range
 *
 * Safety Features:
 *   - Dry-run by default (must use --execute to modify)
 *   - Creates backup branch before any modifications
 *   - Won't run on main/master branches
 *   - Warns about already-pushed commits
 */

import { $ } from 'bun'
import { existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

// Configuration
const CONFIG = {
	timezone: 'America/Denver', // Mountain Time
	businessStart: 9, // 9 AM
	businessEnd: 17, // 5 PM
	baseBranch: 'main',
}

interface CommitInfo {
	hash: string
	shortHash: string
	authorDate: number
	message: string
	isBusinessHours: boolean
	newTimestamp?: number
}

interface ParsedArgs {
	execute: boolean
	range: string | null
	baseBranch: string
}

// ANSI colors
const colors = {
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
	dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
}

const log = {
	info: (msg: string) => console.log(`${colors.blue('[INFO]')} ${msg}`),
	warn: (msg: string) => console.log(`${colors.yellow('[WARN]')} ${msg}`),
	success: (msg: string) => console.log(`${colors.green('[OK]')} ${msg}`),
	error: (msg: string) => console.log(`${colors.red('[ERROR]')} ${msg}`),
}

function parseArgs(): ParsedArgs {
	const args = process.argv.slice(2)

	const result: ParsedArgs = {
		execute: false,
		range: null,
		baseBranch: CONFIG.baseBranch,
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		switch (arg) {
			case '--execute':
				result.execute = true
				break
			case '--range':
				result.range = args[++i] || null
				break
			case '--branch':
				result.baseBranch = args[++i] || CONFIG.baseBranch
				break
			case '--help':
			case '-h':
				showHelp()
				process.exit(0)
		}
	}

	return result
}

function showHelp(): void {
	console.log(`
🕐 Shift Commits Outside Business Hours

Usage:
  bun run scripts/shift-commits.ts [OPTIONS]

Options:
  --execute       Actually perform the rewrite (default is dry-run)
  --range RANGE   Specific commit range (e.g., HEAD~5..HEAD)
  --branch REF    Base branch to compare against (default: main)
  --help, -h      Show this help message

Examples:
  bun run scripts/shift-commits.ts                 # Preview changes
  bun run scripts/shift-commits.ts --execute       # Apply changes
  bun run scripts/shift-commits.ts --range HEAD~3  # Last 3 commits
`)
}

/**
 * Convert a Unix timestamp to Mountain Time components
 */
function toMountainTime(timestamp: number): { hour: number; dayOfWeek: number; formatted: string } {
	const date = new Date(timestamp * 1000)

	const fullFormatted = date.toLocaleString('en-US', {
		timeZone: CONFIG.timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	// Parse hour from the locale string
	const hour = parseInt(
		date.toLocaleString('en-US', { timeZone: CONFIG.timezone, hour: 'numeric', hour12: false }),
		10
	)

	// Get day of week (0 = Sunday, 6 = Saturday)
	const dayOfWeek = new Date(
		date.toLocaleString('en-US', { timeZone: CONFIG.timezone })
	).getDay()

	return { hour, dayOfWeek, formatted: fullFormatted }
}

/**
 * Check if a timestamp falls within business hours (Mon-Fri, 9am-5pm MT)
 */
function isBusinessHours(timestamp: number): boolean {
	const { hour, dayOfWeek } = toMountainTime(timestamp)

	// Weekday check (1-5 = Mon-Fri, but JS uses 0=Sun, 6=Sat)
	const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

	// Hour check
	const isDuringWork = hour >= CONFIG.businessStart && hour < CONFIG.businessEnd

	return isWeekday && isDuringWork
}

/**
 * Shift a timestamp to outside business hours
 */
function shiftTimestamp(timestamp: number): number {
	const { hour } = toMountainTime(timestamp)

	// Randomly choose: evening (60%) or early morning (40%)
	const shiftToEvening = Math.random() < 0.6

	let shiftHours: number
	if (shiftToEvening) {
		// Shift to evening (5pm-10pm range)
		shiftHours = CONFIG.businessEnd - hour + Math.floor(Math.random() * 5)
	} else {
		// Shift to early morning (5am-9am range)
		shiftHours = -(hour - CONFIG.businessStart + 1 + Math.floor(Math.random() * 4))
	}

	// Add random minutes for natural-looking timestamps
	const shiftMinutes = Math.floor(Math.random() * 60)

	return timestamp + shiftHours * 3600 + shiftMinutes * 60
}

/**
 * Get the current git branch
 */
async function getCurrentBranch(): Promise<string> {
	const result = await $`git branch --show-current`.text()
	return result.trim()
}

/**
 * Get commits in a range
 */
async function getCommits(range: string): Promise<CommitInfo[]> {
	const format = '%H|%at|%s'
	const result = await $`git log --reverse --format=${format} ${range}`.text().catch(() => '')

	if (!result.trim()) {
		return []
	}

	return result
		.trim()
		.split('\n')
		.map((line) => {
			const [hash, dateStr, message] = line.split('|')
			const authorDate = parseInt(dateStr, 10)
			const isBizHours = isBusinessHours(authorDate)

			return {
				hash,
				shortHash: hash.slice(0, 8),
				authorDate,
				message: message.slice(0, 50),
				isBusinessHours: isBizHours,
				newTimestamp: isBizHours ? shiftTimestamp(authorDate) : undefined,
			}
		})
}

/**
 * Check how many commits are already pushed
 */
async function countPushedCommits(range: string): Promise<number> {
	const total = await $`git log --format=%H ${range}`.text().catch(() => '')
	const unpushed = await $`git log --format=%H ${range} --not --remotes`.text().catch(() => '')

	const totalCount = total.trim() ? total.trim().split('\n').length : 0
	const unpushedCount = unpushed.trim() ? unpushed.trim().split('\n').length : 0

	return totalCount - unpushedCount
}

/**
 * Rewrite commits with new timestamps
 */
async function rewriteCommits(commits: CommitInfo[]): Promise<void> {
	const toModify = commits.filter((c) => c.newTimestamp)

	if (toModify.length === 0) {
		log.success('No commits need modification!')
		return
	}

	// Create backup branch
	const currentBranch = await getCurrentBranch()
	const backupBranch = `backup/${currentBranch}-${Date.now()}`
	await $`git branch ${backupBranch}`
	log.success(`Created backup branch: ${backupBranch}`)

	// Build the date map for filter-branch
	const dateMap = new Map(toModify.map((c) => [c.hash, c.newTimestamp!]))

	// Create temporary filter script
	const filterScript = join(import.meta.dir, '.tmp-filter-script.sh')
	const scriptContent = `#!/usr/bin/env bash
${Array.from(dateMap.entries())
	.map(
		([hash, ts]) => `if [[ "$GIT_COMMIT" == "${hash}"* ]]; then
  export GIT_AUTHOR_DATE="@${ts}"
  export GIT_COMMITTER_DATE="@${ts}"
fi`
	)
	.join('\n')}
`

	writeFileSync(filterScript, scriptContent, { mode: 0o755 })

	try {
		// Get the first commit's parent for the range
		const firstCommit = toModify[0].hash
		const parent = await $`git rev-parse ${firstCommit}^`.text().catch(() => '')

		if (parent.trim()) {
			await $`git filter-branch -f --env-filter "source ${filterScript}" ${parent.trim()}..HEAD`
		} else {
			await $`git filter-branch -f --env-filter "source ${filterScript}" HEAD`
		}

		// Clean up filter-branch refs
		const refs = await $`git for-each-ref --format=%(refname) refs/original/`.text().catch(() => '')
		for (const ref of refs.trim().split('\n').filter(Boolean)) {
			await $`git update-ref -d ${ref}`.quiet().catch(() => {})
		}

		log.success('Commits successfully rewritten!')
		log.info(`Backup available at: ${backupBranch}`)
		log.warn("If you've already pushed, you'll need: git push --force-with-lease")
	} finally {
		// Clean up temp script
		if (existsSync(filterScript)) {
			unlinkSync(filterScript)
		}
	}
}

/**
 * Display commits in a table format
 */
function displayCommits(commits: CommitInfo[]): void {
	console.log('')
	console.log(
		`${'COMMIT'.padEnd(10)} ${'ORIGINAL (MT)'.padEnd(18)} ${'STATUS'.padEnd(8)} ${'NEW (MT)'.padEnd(18)} MESSAGE`
	)
	console.log('─'.repeat(90))

	for (const commit of commits) {
		const original = toMountainTime(commit.authorDate).formatted
		const status = commit.isBusinessHours ? colors.yellow('SHIFT') : colors.green('OK')
		const newTime = commit.newTimestamp ? toMountainTime(commit.newTimestamp).formatted : '-'
		const msg = commit.message.slice(0, 30)

		console.log(
			`${commit.shortHash.padEnd(10)} ${original.padEnd(18)} ${status.padEnd(17)} ${newTime.padEnd(18)} ${msg}`
		)
	}

	console.log('')
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const args = parseArgs()

	// Safety: don't run on main/master
	const currentBranch = await getCurrentBranch()
	if (currentBranch === 'main' || currentBranch === 'master') {
		log.error(`Refusing to run on ${currentBranch} branch. Please use a feature branch.`)
		process.exit(1)
	}

	// Determine commit range
	const range = args.range ? `${args.range}..HEAD` : `${args.baseBranch}..HEAD`

	log.info(`Analyzing commits in range: ${range}`)

	const commits = await getCommits(range)

	if (commits.length === 0) {
		log.info('No commits found in range.')
		return
	}

	log.info(`Found ${commits.length} commits`)

	// Check for pushed commits
	const pushedCount = await countPushedCommits(range)
	if (pushedCount > 0) {
		log.warn(`${pushedCount} commits have already been pushed to remote.`)
		log.warn('Rewriting will require force-push.')
	}

	displayCommits(commits)

	const needsShift = commits.filter((c) => c.isBusinessHours).length
	log.info(`${needsShift} commits need to be shifted`)

	if (needsShift === 0) {
		log.success('All commits are already outside business hours!')
		return
	}

	if (!args.execute) {
		console.log('')
		log.warn('DRY RUN MODE - No changes made')
		log.info('Run with --execute to apply changes')
		return
	}

	// Confirm if pushed commits
	if (pushedCount > 0) {
		const readline = await import('node:readline')
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
		const answer = await new Promise<string>((resolve) => {
			rl.question('Continue with pushed commits? (y/N): ', resolve)
		})
		rl.close()

		if (answer.toLowerCase() !== 'y') {
			log.info('Aborted.')
			return
		}
	}

	await rewriteCommits(commits)
}

main().catch((error) => {
	log.error(`Unexpected error: ${error}`)
	process.exit(1)
})
