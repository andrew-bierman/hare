#!/usr/bin/env bun

/**
 * 🐇 Clean Script
 *
 * Removes build artifacts, caches, and generated files across all apps and packages.
 *
 * Usage:
 *   bun run scripts/clean.ts           # Clean build artifacts (default)
 *   bun run scripts/clean.ts --all     # Clean everything including node_modules
 *   bun run scripts/clean.ts --deps    # Clean only node_modules
 *   bun run scripts/clean.ts --cache   # Clean only caches (.turbo, .wrangler)
 *   bun run scripts/clean.ts --dry-run # Show what would be deleted
 *   bun run scripts/clean.ts --quiet   # Suppress detailed output
 */

import { existsSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

interface CleanTarget {
	pattern: string
	description: string
	category: 'build' | 'cache' | 'deps' | 'generated'
}

interface CleanResult {
	path: string
	deleted: boolean
	size?: number
	error?: string
}

const CLEAN_TARGETS: CleanTarget[] = [
	// Build artifacts
	{ pattern: 'dist', description: 'Build output', category: 'build' },
	{ pattern: '.next', description: 'Next.js build', category: 'build' },
	{ pattern: '.open-next', description: 'OpenNext build', category: 'build' },
	{ pattern: '.vercel', description: 'Vercel build', category: 'build' },
	{ pattern: 'out', description: 'Static export', category: 'build' },
	{ pattern: '*.tsbuildinfo', description: 'TS build info', category: 'build' },

	// Cache directories
	{ pattern: '.turbo', description: 'Turbo cache', category: 'cache' },
	{ pattern: '.wrangler', description: 'Wrangler cache', category: 'cache' },
	{ pattern: '.cache', description: 'Generic cache', category: 'cache' },
	{ pattern: '.vite', description: 'Vite cache', category: 'cache' },
	{ pattern: '.parcel-cache', description: 'Parcel cache', category: 'cache' },

	// Test artifacts
	{ pattern: 'coverage', description: 'Test coverage', category: 'generated' },
	{ pattern: '.nyc_output', description: 'NYC coverage', category: 'generated' },

	// Dependencies
	{ pattern: 'node_modules', description: 'Dependencies', category: 'deps' },
]

const WORKSPACE_DIRS = ['apps', 'packages', 'scripts']

type Category = 'build' | 'cache' | 'deps' | 'generated'

interface ParsedArgs {
	categories: Set<Category>
	dryRun: boolean
	quiet: boolean
}

function parseArgs(): ParsedArgs {
	const args = process.argv.slice(2)

	const dryRun = args.includes('--dry-run')
	const quiet = args.includes('--quiet')

	if (args.includes('--all')) {
		return {
			categories: new Set<Category>(['build', 'cache', 'deps', 'generated']),
			dryRun,
			quiet,
		}
	}

	if (args.includes('--deps')) {
		return {
			categories: new Set<Category>(['deps']),
			dryRun,
			quiet,
		}
	}

	if (args.includes('--cache')) {
		return {
			categories: new Set<Category>(['cache']),
			dryRun,
			quiet,
		}
	}

	// Default: build artifacts and caches (not deps)
	return {
		categories: new Set<Category>(['build', 'cache', 'generated']),
		dryRun,
		quiet,
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getDirSize(dirPath: string): number {
	let size = 0
	try {
		const entries = readdirSync(dirPath, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name)
			if (entry.isDirectory()) {
				size += getDirSize(fullPath)
			} else {
				try {
					size += statSync(fullPath).size
				} catch {
					// Skip files we can't stat
				}
			}
		}
	} catch {
		// Skip directories we can't read
	}
	return size
}

function findTargets(options: {
	rootDir: string
	targets: CleanTarget[]
	categories: Set<Category>
}): string[] {
	const { rootDir, targets, categories } = options
	const foundSet: Set<string> = new Set()

	const activeTargets = targets.filter((t) => categories.has(t.category))
	const patterns = activeTargets.map((t) => t.pattern)

	// Helper to check if a path is inside another path that will be deleted
	const isNestedInFound = (path: string): boolean => {
		for (const existing of foundSet) {
			if (path.startsWith(existing + '/')) return true
		}
		return false
	}

	// Helper to add a path, removing any nested paths
	const addPath = (path: string): void => {
		if (isNestedInFound(path)) return
		// Remove any existing paths that are nested in this new path
		for (const existing of foundSet) {
			if (existing.startsWith(path + '/')) {
				foundSet.delete(existing)
			}
		}
		foundSet.add(path)
	}

	// Check root level
	for (const pattern of patterns) {
		if (pattern.includes('*')) {
			// Handle glob patterns like *.tsbuildinfo
			const ext = pattern.replace('*', '')
			try {
				const entries = readdirSync(rootDir)
				for (const entry of entries) {
					if (entry.endsWith(ext)) {
						addPath(join(rootDir, entry))
					}
				}
			} catch {
				// Skip if can't read
			}
		} else {
			const fullPath = join(rootDir, pattern)
			if (existsSync(fullPath)) {
				addPath(fullPath)
			}
		}
	}

	// Check workspace directories
	for (const wsDir of WORKSPACE_DIRS) {
		const wsDirPath = join(rootDir, wsDir)
		if (!existsSync(wsDirPath)) continue

		try {
			const packages = readdirSync(wsDirPath, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)

			for (const pkg of packages) {
				const pkgPath = join(wsDirPath, pkg)

				for (const pattern of patterns) {
					if (pattern.includes('*')) {
						const ext = pattern.replace('*', '')
						try {
							const entries = readdirSync(pkgPath)
							for (const entry of entries) {
								if (entry.endsWith(ext)) {
									addPath(join(pkgPath, entry))
								}
							}
						} catch {
							// Skip if can't read
						}
					} else {
						const fullPath = join(pkgPath, pattern)
						if (existsSync(fullPath)) {
							addPath(fullPath)
						}
					}
				}
			}
		} catch {
			// Skip if can't read workspace dir
		}
	}

	return Array.from(foundSet).sort()
}

function getSize(targetPath: string): number {
	try {
		const stat = statSync(targetPath)
		if (stat.isDirectory()) {
			return getDirSize(targetPath)
		}
		return stat.size
	} catch {
		return 0
	}
}

function deleteTarget(targetPath: string, dryRun: boolean): CleanResult {
	const size = getSize(targetPath)

	if (dryRun) {
		return { path: targetPath, deleted: false, size }
	}

	try {
		rmSync(targetPath, { recursive: true, force: true })
		return { path: targetPath, deleted: true, size }
	} catch (error) {
		return {
			path: targetPath,
			deleted: false,
			size,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

function printSummary(results: CleanResult[], rootDir: string, dryRun: boolean): void {
	console.log('\n' + '─'.repeat(60))
	console.log(dryRun ? '📋 Clean Preview (dry run)' : '📊 Clean Summary')
	console.log('─'.repeat(60))

	const deleted = results.filter((r) => r.deleted || dryRun)
	const failed = results.filter((r) => !r.deleted && !dryRun && r.error)
	const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0)

	if (deleted.length === 0) {
		console.log('✨ Nothing to clean!')
		return
	}

	for (const result of results) {
		const relPath = relative(rootDir, result.path)
		const sizeStr = result.size ? ` (${formatBytes(result.size)})` : ''

		if (dryRun) {
			console.log(`  📁 ${relPath}${sizeStr}`)
		} else if (result.deleted) {
			console.log(`  ✅ ${relPath}${sizeStr}`)
		} else if (result.error) {
			console.log(`  ❌ ${relPath} - ${result.error}`)
		}
	}

	console.log('─'.repeat(60))

	if (dryRun) {
		console.log(`📦 Would delete ${deleted.length} items (${formatBytes(totalSize)})`)
		console.log('\nRun without --dry-run to delete these files.')
	} else {
		console.log(`🗑️  Deleted ${deleted.length} items (${formatBytes(totalSize)})`)
		if (failed.length > 0) {
			console.log(`⚠️  Failed to delete ${failed.length} items`)
		}
	}
}

async function main(): Promise<void> {
	const { categories, dryRun, quiet } = parseArgs()
	const rootDir = process.cwd()

	const categoryNames = Array.from(categories).join(', ')
	console.log(`🐇 Cleaning ${categoryNames}${dryRun ? ' (dry run)' : ''}...\n`)

	const targets = findTargets({
		rootDir,
		targets: CLEAN_TARGETS,
		categories,
	})

	if (targets.length === 0) {
		console.log('✨ Nothing to clean!')
		return
	}

	if (!quiet) {
		console.log(`Found ${targets.length} items to clean:\n`)
	}

	const results: CleanResult[] = []

	for (const target of targets) {
		const relPath = relative(rootDir, target)
		if (!quiet && !dryRun) {
			process.stdout.write(`  Cleaning ${relPath}...`)
		}

		const result = deleteTarget(target, dryRun)
		results.push(result)

		if (!quiet && !dryRun) {
			if (result.deleted) {
				console.log(` ✅ (${formatBytes(result.size || 0)})`)
			} else if (result.error) {
				console.log(` ❌`)
			}
		}
	}

	printSummary(results, rootDir, dryRun)

	const hasFailures = results.some((r) => !r.deleted && !dryRun && r.error)
	process.exit(hasFailures ? 1 : 0)
}

main().catch((error) => {
	console.error('❌ Unexpected error:', error)
	process.exit(1)
})
