#!/usr/bin/env bun

/**
 * 🐇 Sort Package.json Script
 *
 * Traverses the monorepo and sorts all package.json files.
 * Processes all files in a single command for speed.
 *
 * Usage:
 *   bun run scripts/sort-packages.ts         # Sort all package.json files
 *   bun run scripts/sort-packages.ts --check # Check if files are sorted (CI mode)
 */

import { $ } from 'bun'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()
const CHECK_MODE = process.argv.includes('--check')

async function findPackageJsonFiles(): Promise<string[]> {
	const files: string[] = []

	// Root package.json
	files.push(join(ROOT, 'package.json'))

	// Scripts package.json
	const scriptsPath = join(ROOT, 'scripts', 'package.json')
	if (await fileExists(scriptsPath)) {
		files.push(scriptsPath)
	}

	// Apps workspaces
	const appsDir = join(ROOT, 'apps')
	if (await dirExists(appsDir)) {
		for (const app of await readdir(appsDir)) {
			const pkgPath = join(appsDir, app, 'package.json')
			if (await fileExists(pkgPath)) {
				files.push(pkgPath)
			}
		}
	}

	// Packages workspaces
	const packagesDir = join(ROOT, 'packages')
	if (await dirExists(packagesDir)) {
		for (const pkg of await readdir(packagesDir)) {
			const pkgPath = join(packagesDir, pkg, 'package.json')
			if (await fileExists(pkgPath)) {
				files.push(pkgPath)
			}
		}
	}

	return files
}

async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path)
		return s.isFile()
	} catch {
		return false
	}
}

async function dirExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path)
		return s.isDirectory()
	} catch {
		return false
	}
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`
	return `${(ms / 1000).toFixed(1)}s`
}

async function main(): Promise<void> {
	const startTime = performance.now()
	const files = await findPackageJsonFiles()

	if (CHECK_MODE) {
		console.log(`🔍 Checking ${files.length} package.json files...`)
	} else {
		console.log(`📦 Sorting ${files.length} package.json files...`)
	}

	try {
		// Run sort-package-json on all files at once (much faster than one-by-one)
		const args = CHECK_MODE ? [...files, '--check'] : files
		await $`bun run --cwd scripts sort-package-json ${args}`.quiet()

		const duration = formatDuration(performance.now() - startTime)
		if (CHECK_MODE) {
			console.log(`✅ All ${files.length} files sorted (${duration})`)
		} else {
			console.log(`✅ Sorted ${files.length} files (${duration})`)
		}
	} catch (error) {
		const duration = formatDuration(performance.now() - startTime)

		if (CHECK_MODE) {
			// In check mode, find which files are unsorted
			console.log(`\n❌ Some files are not sorted (${duration}):`)
			const unsorted: string[] = []
			await Promise.all(
				files.map(async (file) => {
					try {
						await $`bun run --cwd scripts sort-package-json ${file} --check`.quiet()
					} catch {
						unsorted.push(file.replace(ROOT + '/', ''))
					}
				})
			)
			for (const file of unsorted.sort()) {
				console.log(`   ${file}`)
			}
			console.log('\nRun `bun run sort-packages` to fix')
			process.exit(1)
		} else {
			console.log(`❌ Failed to sort files (${duration})`)
			console.log(error instanceof Error ? error.message : String(error))
			process.exit(1)
		}
	}
}

main().catch((error) => {
	console.error('❌ Unexpected error:', error)
	process.exit(1)
})
