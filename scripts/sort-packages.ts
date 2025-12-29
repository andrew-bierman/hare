#!/usr/bin/env bun

/**
 * 🐇 Sort Package.json Script
 *
 * Traverses the monorepo and sorts all package.json files.
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

async function sortPackageJson(filePath: string, check: boolean): Promise<boolean> {
	const relativePath = filePath.replace(ROOT + '/', '')

	try {
		if (check) {
			await $`bunx sort-package-json ${filePath} --check`.quiet()
			console.log(`  ✅ ${relativePath}`)
			return true
		} else {
			await $`bunx sort-package-json ${filePath}`.quiet()
			console.log(`  ✅ ${relativePath}`)
			return true
		}
	} catch {
		if (check) {
			console.log(`  ❌ ${relativePath} (not sorted)`)
		} else {
			console.log(`  ❌ ${relativePath} (failed to sort)`)
		}
		return false
	}
}

async function main(): Promise<void> {
	const files = await findPackageJsonFiles()

	if (CHECK_MODE) {
		console.log('🔍 Checking package.json files are sorted...\n')
	} else {
		console.log('📦 Sorting package.json files...\n')
	}

	let allPassed = true

	for (const file of files) {
		const passed = await sortPackageJson(file, CHECK_MODE)
		if (!passed) {
			allPassed = false
		}
	}

	console.log('')

	if (allPassed) {
		if (CHECK_MODE) {
			console.log(`✅ All ${files.length} package.json files are sorted`)
		} else {
			console.log(`✅ Sorted ${files.length} package.json files`)
		}
	} else {
		if (CHECK_MODE) {
			console.log('❌ Some package.json files are not sorted')
			console.log('   Run `bun run sort-packages` to fix')
			process.exit(1)
		} else {
			console.log('❌ Some package.json files failed to sort')
			process.exit(1)
		}
	}
}

main().catch((error) => {
	console.error('❌ Unexpected error:', error)
	process.exit(1)
})
