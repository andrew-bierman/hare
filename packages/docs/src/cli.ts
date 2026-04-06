#!/usr/bin/env bun

/**
 * CLI for generating MDX documentation from TypeScript source files.
 *
 * Usage:
 *   bun run packages/docs/src/cli.ts          # From monorepo root
 *   bunx @hare/docs generate                  # If published
 *
 * Options:
 *   --config <path>   Path to config file (default: docs.config.ts)
 *   --output <dir>    Output directory for MDX files
 *   --verbose         Print detailed output
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { generateDocs, type PackageConfig } from './generator'

// Default configuration for Hare monorepo
const DEFAULT_CONFIG: PackageConfig[] = [
	{
		name: '@hare/agent',
		path: 'packages/agent/src',
		outputFile: 'packages/docs/content/_generated/agent.mdx',
		title: 'Agent SDK Reference',
		description: 'Auto-generated API documentation for @hare/agent',
	},
	{
		name: '@hare/tools',
		path: 'packages/tools/src',
		outputFile: 'packages/docs/content/_generated/tools.mdx',
		title: 'Tools Reference',
		description: 'Auto-generated documentation for all available agent tools',
	},
]

function findMonorepoRoot(startDir: string): string {
	let dir = startDir
	while (dir !== '/' && dir !== '') {
		// Check for lockfiles that indicate the monorepo root
		if (
			fs.existsSync(path.join(dir, 'bun.lock')) ||
			fs.existsSync(path.join(dir, 'pnpm-lock.yaml')) ||
			fs.existsSync(path.join(dir, 'bun.lockb'))
		) {
			// Also verify this is the actual root by checking for packages/ directory
			if (fs.existsSync(path.join(dir, 'packages'))) {
				return dir
			}
		}
		const parent = path.dirname(dir)
		if (parent === dir) break // Reached filesystem root
		dir = parent
	}
	return startDir
}

async function main() {
	const args = process.argv.slice(2)
	const verbose = args.includes('--verbose') || args.includes('-v')

	// Find monorepo root
	const baseDir = findMonorepoRoot(process.cwd())

	if (verbose) {
		console.log(`Monorepo root: ${baseDir}`)
	}

	await generateDocs({
		packages: DEFAULT_CONFIG,
		baseDir,
		verbose,
	})
}

main().catch((err) => {
	console.error('Error generating docs:', err)
	process.exit(1)
})
