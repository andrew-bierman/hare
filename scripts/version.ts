#!/usr/bin/env bun

/**
 * 🐇 Version Sync Script
 *
 * Updates versions across all packages in the monorepo, keeping them in sync.
 * Follows semantic versioning (semver).
 *
 * Usage:
 *   bun run scripts/version.ts patch        # 0.1.0 → 0.1.1
 *   bun run scripts/version.ts minor        # 0.1.0 → 0.2.0
 *   bun run scripts/version.ts major        # 0.1.0 → 1.0.0
 *   bun run scripts/version.ts prerelease   # 0.1.0 → 0.1.1-0
 *   bun run scripts/version.ts 1.2.3        # Set specific version
 *   bun run scripts/version.ts              # Show current versions
 *
 * Options:
 *   --preid=<id>    Prerelease identifier (e.g., --preid=beta → 0.1.1-beta.0)
 *   --dry-run       Show what would change without writing
 */

import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()

// Parse args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const preidArg = args.find((a) => a.startsWith('--preid='))
const PREID = preidArg ? preidArg.split('=')[1] : undefined
const bumpType = args.find((a) => !a.startsWith('--'))

type BumpType = 'major' | 'minor' | 'patch' | 'prerelease'

interface PackageInfo {
	path: string
	name: string
	version: string
	isPrivate: boolean
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

async function findPackages(): Promise<PackageInfo[]> {
	const packages: PackageInfo[] = []

	// Helper to read package.json
	async function readPkg(pkgPath: string): Promise<PackageInfo | null> {
		if (!(await fileExists(pkgPath))) return null
		const content = await readFile(pkgPath, 'utf-8')
		const pkg = JSON.parse(content)
		return {
			path: pkgPath,
			name: pkg.name,
			version: pkg.version || '0.0.0',
			isPrivate: pkg.private === true,
		}
	}

	// Root package
	const rootPkg = await readPkg(join(ROOT, 'package.json'))
	if (rootPkg) packages.push(rootPkg)

	// Apps
	const appsDir = join(ROOT, 'apps')
	if (await dirExists(appsDir)) {
		for (const app of await readdir(appsDir)) {
			const pkg = await readPkg(join(appsDir, app, 'package.json'))
			if (pkg) packages.push(pkg)
		}
	}

	// Packages
	const packagesDir = join(ROOT, 'packages')
	if (await dirExists(packagesDir)) {
		for (const dir of await readdir(packagesDir)) {
			const pkg = await readPkg(join(packagesDir, dir, 'package.json'))
			if (pkg) packages.push(pkg)
		}
	}

	return packages
}

function parseVersion(version: string): {
	major: number
	minor: number
	patch: number
	prerelease: string[]
} {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/)
	if (!match) {
		throw new Error(`Invalid version: ${version}`)
	}
	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
		prerelease: match[4] ? match[4].split('.') : [],
	}
}

function formatVersion(v: { major: number; minor: number; patch: number; prerelease: string[] }): string {
	const base = `${v.major}.${v.minor}.${v.patch}`
	return v.prerelease.length > 0 ? `${base}-${v.prerelease.join('.')}` : base
}

function bumpVersion(currentVersion: string, type: BumpType, preid?: string): string {
	const v = parseVersion(currentVersion)

	switch (type) {
		case 'major':
			return formatVersion({ major: v.major + 1, minor: 0, patch: 0, prerelease: [] })
		case 'minor':
			return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0, prerelease: [] })
		case 'patch':
			return formatVersion({ major: v.major, minor: v.minor, patch: v.patch + 1, prerelease: [] })
		case 'prerelease': {
			const id = preid || 'alpha'
			if (v.prerelease.length > 0 && v.prerelease[0] === id) {
				// Increment prerelease number
				const num = Number.parseInt(v.prerelease[1] || '0', 10)
				return formatVersion({ ...v, prerelease: [id, String(num + 1)] })
			}
			// New prerelease
			return formatVersion({
				major: v.major,
				minor: v.minor,
				patch: v.patch + 1,
				prerelease: [id, '0'],
			})
		}
		default:
			throw new Error(`Unknown bump type: ${type}`)
	}
}

function isValidVersion(version: string): boolean {
	return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)
}

async function updatePackageVersion(pkgPath: string, newVersion: string): Promise<void> {
	const content = await readFile(pkgPath, 'utf-8')
	const pkg = JSON.parse(content)
	pkg.version = newVersion
	await writeFile(pkgPath, JSON.stringify(pkg, null, '\t') + '\n')
}

async function showVersions(packages: PackageInfo[]): Promise<void> {
	console.log('📦 Current package versions:\n')

	const publishable = packages.filter((p) => !p.isPrivate)
	const internal = packages.filter((p) => p.isPrivate)

	if (publishable.length > 0) {
		console.log('  Publishable packages:')
		for (const pkg of publishable) {
			const rel = pkg.path.replace(ROOT + '/', '')
			console.log(`    ${pkg.name.padEnd(25)} v${pkg.version}  (${rel})`)
		}
	}

	if (internal.length > 0) {
		console.log('\n  Private packages:')
		for (const pkg of internal) {
			const rel = pkg.path.replace(ROOT + '/', '')
			console.log(`    ${pkg.name.padEnd(25)} v${pkg.version}  (${rel})`)
		}
	}

	console.log('\n💡 Usage:')
	console.log('   bun run version patch      # Bump patch version')
	console.log('   bun run version minor      # Bump minor version')
	console.log('   bun run version major      # Bump major version')
	console.log('   bun run version 1.0.0      # Set specific version')
}

async function main(): Promise<void> {
	const packages = await findPackages()

	// No bump type provided - show current versions
	if (!bumpType) {
		await showVersions(packages)
		return
	}

	// Determine new version
	let newVersion: string

	if (isValidVersion(bumpType)) {
		// Specific version provided
		newVersion = bumpType
	} else if (['major', 'minor', 'patch', 'prerelease'].includes(bumpType)) {
		// Get current version from a publishable package (prefer 'hare' SDK)
		const sdkPkg = packages.find((p) => p.name === 'hare' && !p.isPrivate)
		const publishable = packages.filter((p) => !p.isPrivate)
		const reference = sdkPkg || publishable[0]

		if (!reference) {
			console.error('❌ No publishable packages found')
			process.exit(1)
		}

		console.log(`📍 Using ${reference.name} v${reference.version} as reference\n`)
		newVersion = bumpVersion(reference.version, bumpType as BumpType, PREID)
	} else {
		console.error(`❌ Invalid bump type: ${bumpType}`)
		console.error('   Valid options: major, minor, patch, prerelease, or a specific version (e.g., 1.0.0)')
		process.exit(1)
	}

	// Show what we're doing
	const prefix = DRY_RUN ? '🔍 [DRY RUN]' : '🚀'
	console.log(`${prefix} Updating all packages to v${newVersion}\n`)

	// Update all packages
	for (const pkg of packages) {
		const rel = pkg.path.replace(ROOT + '/', '')
		const arrow = pkg.version === newVersion ? '=' : '→'

		if (DRY_RUN) {
			console.log(`  ${pkg.name.padEnd(25)} v${pkg.version} ${arrow} v${newVersion}  (${rel})`)
		} else {
			await updatePackageVersion(pkg.path, newVersion)
			console.log(`  ✅ ${pkg.name.padEnd(25)} v${pkg.version} ${arrow} v${newVersion}`)
		}
	}

	console.log('')

	if (DRY_RUN) {
		console.log('ℹ️  Dry run complete. No files were modified.')
		console.log('   Remove --dry-run to apply changes.')
	} else {
		console.log(`✅ Updated ${packages.length} packages to v${newVersion}`)
		console.log('')
		console.log('📝 Next steps:')
		console.log('   1. Review changes: git diff')
		console.log('   2. Commit: git commit -am "chore: bump version to ' + newVersion + '"')
		console.log('   3. Tag: git tag v' + newVersion)
	}
}

main().catch((error) => {
	console.error('❌ Unexpected error:', error)
	process.exit(1)
})
