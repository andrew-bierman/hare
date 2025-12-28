#!/usr/bin/env bun

/**
 * 🐇 Reusable Check Runner Script
 *
 * Runs a configurable series of checks (lint, typecheck, build, test, etc.)
 * with proper error handling, timing, and summary reporting.
 *
 * Usage:
 *   bun run .github/scripts/checks.ts                    # Run default checks
 *   bun run .github/scripts/checks.ts --lint --typecheck # Run specific checks
 *   bun run .github/scripts/checks.ts --all              # Run all available checks
 *   bun run .github/scripts/checks.ts --continue         # Continue on failure
 *
 * Available flags:
 *   --lint       Run linting
 *   --typecheck  Run TypeScript type checking
 *   --build      Run production build
 *   --test       Run tests
 *   --all        Run all checks
 *   --continue   Continue running checks even if one fails
 *   --quiet      Suppress command output (show only summary)
 */

import { $ } from 'bun'

interface CheckConfig {
	id: string
	name: string
	command: string
	description?: string
}

interface CheckResult {
	id: string
	name: string
	success: boolean
	duration: number
	error?: string
}

const AVAILABLE_CHECKS: CheckConfig[] = [
	{
		id: 'lint',
		name: 'Lint',
		command: 'bun run lint:fix',
		description: 'Run Biome linting',
	},
	{
		id: 'typecheck',
		name: 'TypeScript',
		command: 'bun run typecheck',
		description: 'Run TypeScript type checking',
	},
	{
		id: 'build',
		name: 'Build',
		command: 'bun run build',
		description: 'Run production build',
	},
	{
		id: 'test',
		name: 'Test',
		command: 'bun run test',
		description: 'Run test suite',
	},
]

const DEFAULT_CHECK_IDS = ['lint', 'typecheck', 'build']

function parseArgs(): { checkIds: string[]; continueOnFailure: boolean; quiet: boolean } {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		return { checkIds: DEFAULT_CHECK_IDS, continueOnFailure: false, quiet: false }
	}

	const continueOnFailure = args.includes('--continue')
	const quiet = args.includes('--quiet')

	if (args.includes('--all')) {
		return {
			checkIds: AVAILABLE_CHECKS.map((c) => c.id),
			continueOnFailure,
			quiet,
		}
	}

	const checkIds = args
		.filter((arg) => arg.startsWith('--') && !['--continue', '--quiet', '--all'].includes(arg))
		.map((arg) => arg.slice(2))
		.filter((id) => AVAILABLE_CHECKS.some((c) => c.id === id))

	if (checkIds.length === 0) {
		return { checkIds: DEFAULT_CHECK_IDS, continueOnFailure, quiet }
	}

	return { checkIds, continueOnFailure, quiet }
}

async function runCheck(config: CheckConfig, quiet: boolean): Promise<CheckResult> {
	const start = performance.now()

	try {
		if (quiet) {
			await $`${config.command.split(' ')}`.quiet()
		} else {
			await $`${config.command.split(' ')}`
		}

		return {
			id: config.id,
			name: config.name,
			success: true,
			duration: performance.now() - start,
		}
	} catch (error) {
		return {
			id: config.id,
			name: config.name,
			success: false,
			duration: performance.now() - start,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`
	}
	return `${(ms / 1000).toFixed(2)}s`
}

function printSummary(results: CheckResult[]): void {
	console.log('\n' + '─'.repeat(50))
	console.log('📊 Check Summary')
	console.log('─'.repeat(50))

	for (const result of results) {
		const icon = result.success ? '✅' : '❌'
		const duration = formatDuration(result.duration)
		console.log(`${icon} ${result.name.padEnd(15)} ${duration}`)
	}

	console.log('─'.repeat(50))

	const passed = results.filter((r) => r.success).length
	const failed = results.filter((r) => !r.success).length
	const total = results.length
	const totalDuration = formatDuration(results.reduce((sum, r) => sum + r.duration, 0))

	if (failed === 0) {
		console.log(`🎉 All ${total} checks passed in ${totalDuration}`)
	} else {
		console.log(`💥 ${failed}/${total} checks failed (${passed} passed) in ${totalDuration}`)
	}
}

async function runChecks(options: {
	checks: CheckConfig[]
	continueOnFailure: boolean
	quiet: boolean
}): Promise<CheckResult[]> {
	const { checks, continueOnFailure, quiet } = options
	const results: CheckResult[] = []

	console.log('🐇 Running checks...\n')

	for (const check of checks) {
		console.log(`🔍 ${check.name}...`)

		const result = await runCheck(check, quiet)
		results.push(result)

		if (result.success) {
			console.log(`   ✅ Passed (${formatDuration(result.duration)})\n`)
		} else {
			console.log(`   ❌ Failed (${formatDuration(result.duration)})\n`)

			if (!continueOnFailure) {
				break
			}
		}
	}

	return results
}

async function main(): Promise<void> {
	const { checkIds, continueOnFailure, quiet } = parseArgs()

	const checks = checkIds
		.map((id) => AVAILABLE_CHECKS.find((c) => c.id === id))
		.filter((c): c is CheckConfig => c !== undefined)

	if (checks.length === 0) {
		console.error('❌ No valid checks specified')
		console.log('\nAvailable checks:')
		for (const check of AVAILABLE_CHECKS) {
			console.log(`  --${check.id.padEnd(12)} ${check.description}`)
		}
		process.exit(1)
	}

	const results = await runChecks({ checks, continueOnFailure, quiet })

	printSummary(results)

	const hasFailures = results.some((r) => !r.success)
	process.exit(hasFailures ? 1 : 0)
}

main().catch((error) => {
	console.error('❌ Unexpected error:', error)
	process.exit(1)
})

export { AVAILABLE_CHECKS, runChecks, type CheckConfig, type CheckResult }
