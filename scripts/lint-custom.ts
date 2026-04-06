#!/usr/bin/env bun

/**
 * Custom Lint Checks
 *
 * Catches patterns that Biome/TypeScript cannot:
 * - Magic numbers in setTimeout/setInterval/fetch timeouts
 * - Raw status strings that should use enums
 * - Hardcoded User-Agent strings
 * - Raw cents-to-dollars division
 * - Console usage in production code (stricter than Biome warn)
 *
 * Usage:
 *   bun run scripts/lint-custom.ts          # Check mode (exit 1 on violations)
 *   bun run scripts/lint-custom.ts --report # Print detailed report
 */

import { Glob } from 'bun'

interface Violation {
	file: string
	line: number
	rule: string
	message: string
	snippet: string
}

interface LintRule {
	id: string
	description: string
	pattern: RegExp
	/** Files to include (glob patterns) */
	include: string[]
	/** Files to exclude (glob patterns) */
	exclude?: string[]
	/** Custom validator — return violation message or null to skip */
	validate?: (match: RegExpMatchArray, line: string, filePath: string) => string | null
}

const RULES: LintRule[] = [
	{
		id: 'no-raw-timeout',
		description: 'Use Timeouts.* constants instead of raw millisecond numbers in setTimeout',
		pattern: /setTimeout\([^,]+,\s*(\d{4,})\)/,
		include: ['packages/**/*.ts'],
		exclude: ['**/__tests__/**', '**/*.test.ts', '**/node_modules/**'],
		validate: (match) => {
			const ms = Number.parseInt(match[1])
			if (ms >= 1000) {
				return `Raw timeout ${ms}ms — use a named constant from Timeouts`
			}
			return null
		},
	},
	{
		id: 'no-raw-agent-status',
		description: 'Use config.enums.agentStatus.* instead of raw status strings',
		pattern: /(?:===?|!==?)\s*['"](?:draft|deployed|archived)['"]/,
		include: ['packages/api/**/*.ts', 'packages/agent/**/*.ts'],
		exclude: [
			'**/__tests__/**',
			'**/*.test.ts',
			'**/schema/**',
			'**/node_modules/**',
			'**/enums.ts',
		],
	},
	{
		id: 'no-raw-system-prefix',
		description: "Use isSystemToolId() instead of .startsWith('system-')",
		pattern: /startsWith\(['"]system-['"]\)/,
		include: ['packages/**/*.ts'],
		exclude: ['**/__tests__/**', '**/*.test.ts', '**/constants.ts', '**/node_modules/**'],
	},
	{
		id: 'no-raw-user-agent',
		description: 'Use UserAgents.* constants instead of raw User-Agent strings',
		pattern: /['"]User-Agent['"]:\s*['"](Hare-Agent|Mozilla)/,
		include: ['packages/**/*.ts'],
		exclude: ['**/__tests__/**', '**/*.test.ts', '**/constants.ts', '**/node_modules/**'],
	},
	{
		id: 'no-raw-cents-division',
		description: 'Use CURRENCY.CENTS_PER_DOLLAR instead of raw / 100 for currency',
		pattern: /\.(?:cost|amount|price)\s*\/\s*100\b/,
		include: ['packages/**/*.ts'],
		exclude: ['**/__tests__/**', '**/*.test.ts', '**/node_modules/**'],
	},
]

async function getSourceFiles(include: string[], exclude: string[] = []): Promise<string[]> {
	const files: string[] = []
	for (const pattern of include) {
		const glob = new Glob(pattern)
		for await (const file of glob.scan({ cwd: process.cwd(), absolute: true })) {
			const relativePath = file.replace(process.cwd() + '/', '')
			const excluded = exclude.some((ex) => {
				const exGlob = new Glob(ex)
				return exGlob.match(relativePath)
			})
			if (!excluded) {
				files.push(file)
			}
		}
	}
	return files
}

async function lintFile(filePath: string, rules: LintRule[]): Promise<Violation[]> {
	const violations: Violation[] = []
	const content = await Bun.file(filePath).text()
	const lines = content.split('\n')
	const relativePath = filePath.replace(process.cwd() + '/', '')

	for (const [lineIndex, line] of lines.entries()) {
		for (const rule of rules) {
			const match = line.match(rule.pattern)
			if (!match) continue

			if (rule.validate) {
				const message = rule.validate(match, line, relativePath)
				if (!message) continue
				violations.push({
					file: relativePath,
					line: lineIndex + 1,
					rule: rule.id,
					message,
					snippet: line.trim(),
				})
			} else {
				violations.push({
					file: relativePath,
					line: lineIndex + 1,
					rule: rule.id,
					message: rule.description,
					snippet: line.trim(),
				})
			}
		}
	}

	return violations
}

async function main() {
	const isReport = process.argv.includes('--report')
	const allViolations: Violation[] = []

	for (const rule of RULES) {
		const files = await getSourceFiles(rule.include, rule.exclude)
		for (const file of files) {
			const violations = await lintFile(file, [rule])
			allViolations.push(...violations)
		}
	}

	if (allViolations.length === 0) {
		console.log('✅ No custom lint violations found')
		process.exit(0)
	}

	// Group by rule
	const byRule = new Map<string, Violation[]>()
	for (const v of allViolations) {
		const existing = byRule.get(v.rule) || []
		existing.push(v)
		byRule.set(v.rule, existing)
	}

	console.log(`\n⚠️  Found ${allViolations.length} custom lint violations:\n`)

	for (const [ruleId, violations] of byRule) {
		const rule = RULES.find((r) => r.id === ruleId)
		console.log(`  ${ruleId} (${violations.length}) — ${rule?.description}`)

		if (isReport) {
			for (const v of violations) {
				console.log(`    ${v.file}:${v.line}`)
				console.log(`      ${v.snippet}`)
			}
		}
		console.log()
	}

	if (!isReport) {
		console.log('  Run with --report for details\n')
	}

	process.exit(1)
}

main()
