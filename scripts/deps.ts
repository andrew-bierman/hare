#!/usr/bin/env bun
/**
 * Monorepo dependency management script using npm-check-updates
 *
 * Usage:
 *   bun run deps list              # Show all outdated dependencies
 *   bun run deps list --major      # Show only major updates available
 *   bun run deps update <pkg>      # Update a specific package across monorepo
 *   bun run deps update <p1> <p2>  # Update multiple packages
 *   bun run deps update --all      # Update all (minor/patch only)
 *   bun run deps update --major    # Update all including major versions
 *   bun run deps sync              # Sync versions across workspaces
 */

import { run as ncuRun } from 'npm-check-updates'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')

interface PackageJson {
	name: string
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	peerDependencies?: Record<string, string>
}

interface UpgradeInfo {
	name: string
	current: string
	latest: string
	isMajor: boolean
	location: string
}

const WORKSPACE_PATHS = [ROOT, join(ROOT, 'apps/web'), join(ROOT, 'packages/ui')]

function isMajorUpgrade(current: string, latest: string): boolean {
	const currentMajor = current.replace(/^[\^~]/, '').split('.')[0]
	const latestMajor = latest.replace(/^[\^~]/, '').split('.')[0]
	return currentMajor !== latestMajor
}

async function getUpgrades(options: {
	target?: 'latest' | 'minor' | 'patch'
	filter?: string | string[]
}): Promise<UpgradeInfo[]> {
	const allUpgrades: UpgradeInfo[] = []
	const seen = new Set<string>()

	for (const wsPath of WORKSPACE_PATHS) {
		try {
			const upgraded = (await ncuRun({
				cwd: wsPath,
				packageManager: 'bun',
				target: options.target || 'latest',
				filter: options.filter,
			})) as Record<string, string>

			// Get current versions
			const pkgContent = await readFile(join(wsPath, 'package.json'), 'utf-8')
			const pkg: PackageJson = JSON.parse(pkgContent)
			const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }

			for (const [name, latest] of Object.entries(upgraded)) {
				if (seen.has(name)) continue
				seen.add(name)

				const current = allDeps[name] || 'unknown'
				allUpgrades.push({
					name,
					current,
					latest,
					isMajor: isMajorUpgrade(current, latest),
					location: wsPath.replace(ROOT, '.') || '.',
				})
			}
		} catch {
			// Skip if package.json doesn't exist
		}
	}

	return allUpgrades
}

async function listOutdated(majorOnly: boolean = false): Promise<void> {
	console.log('🔍 Scanning for outdated dependencies...\n')

	const upgrades = await getUpgrades({ target: 'latest' })

	if (upgrades.length === 0) {
		console.log('✅ All dependencies are up to date!')
		return
	}

	const safe = upgrades.filter((u) => !u.isMajor)
	const major = upgrades.filter((u) => u.isMajor)

	if (safe.length > 0 && !majorOnly) {
		console.log('📦 Safe updates (minor/patch):')
		console.log('─'.repeat(70))
		for (const pkg of safe) {
			console.log(`  ${pkg.name.padEnd(35)} ${pkg.current.padEnd(15)} → ${pkg.latest}`)
		}
		console.log()
	}

	if (major.length > 0) {
		console.log('⚠️  Major updates (breaking changes possible):')
		console.log('─'.repeat(70))
		for (const pkg of major) {
			console.log(`  ${pkg.name.padEnd(35)} ${pkg.current.padEnd(15)} → ${pkg.latest}`)
		}
		console.log()
	}

	console.log('💡 Commands:')
	if (safe.length > 0 && !majorOnly) {
		console.log(`   bun run deps update --all          # Update ${safe.length} safe packages`)
	}
	if (major.length > 0) {
		console.log(`   bun run deps update --major        # Update all including ${major.length} major`)
	}
	console.log('   bun run deps update <package>      # Update specific package')
}

async function updatePackages(options: {
	packages?: string[]
	target?: 'latest' | 'minor' | 'patch'
	upgrade?: boolean
}): Promise<void> {
	const { packages, target = 'minor', upgrade = true } = options

	const targetLabel = target === 'latest' ? 'all (including major)' : 'safe (minor/patch)'
	console.log(`📦 Updating ${packages?.length ? packages.join(', ') : targetLabel} packages...\n`)

	for (const wsPath of WORKSPACE_PATHS) {
		const location = wsPath.replace(ROOT, '.') || '.'
		try {
			const upgraded = (await ncuRun({
				cwd: wsPath,
				packageManager: 'bun',
				target,
				filter: packages,
				upgrade,
			})) as Record<string, string>

			const count = Object.keys(upgraded).length
			if (count > 0) {
				console.log(`  ${location}: ${count} package(s) updated`)
				for (const [name, version] of Object.entries(upgraded)) {
					console.log(`    • ${name} → ${version}`)
				}
			}
		} catch (error) {
			// Skip if package.json doesn't exist
		}
	}

	console.log('\n✅ package.json files updated!')
	console.log('💡 Run `bun install` to update lockfile, then `bun run typecheck && bun run build` to verify.')
}

async function syncVersions(): Promise<void> {
	console.log('🔄 Checking dependency versions across workspaces...\n')

	const versionMap = new Map<string, Map<string, string[]>>()

	for (const cwd of WORKSPACE_PATHS) {
		const location = cwd.replace(ROOT, '.') || '.'
		try {
			const content = await readFile(join(cwd, 'package.json'), 'utf-8')
			const pkg: PackageJson = JSON.parse(content)

			for (const deps of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
				if (!deps) continue
				for (const [name, version] of Object.entries(deps)) {
					if (version.startsWith('workspace:')) continue

					if (!versionMap.has(name)) {
						versionMap.set(name, new Map())
					}
					const versions = versionMap.get(name)!
					if (!versions.has(version)) {
						versions.set(version, [])
					}
					versions.get(version)!.push(location)
				}
			}
		} catch {
			// Skip
		}
	}

	const mismatches = [...versionMap.entries()].filter(([, versions]) => versions.size > 1)

	if (mismatches.length === 0) {
		console.log('✅ All dependency versions are in sync!')
		return
	}

	console.log(`⚠️  Found ${mismatches.length} packages with version mismatches:\n`)
	for (const [name, versions] of mismatches) {
		console.log(`  ${name}:`)
		for (const [ver, locs] of versions) {
			console.log(`    ${ver.padEnd(20)} ${locs.join(', ')}`)
		}
	}

	console.log('\n💡 Run `bun run deps update <package>` to align versions.')
}

function printHelp(): void {
	console.log(`
📦 Monorepo Dependency Manager (powered by npm-check-updates)

Usage:
  bun run deps <command> [options]

Commands:
  list                    Show all outdated dependencies
  list --major            Show only packages with major updates
  update <pkg> [pkg2...]  Update specific package(s) across monorepo
  update --all            Update all packages (minor/patch only)
  update --major          Update all packages including major versions
  sync                    Check for version mismatches across workspaces

Examples:
  bun run deps list
  bun run deps update typescript
  bun run deps update @types/node @types/react
  bun run deps update --all
  bun run deps update --major
  bun run deps sync
`)
}

// CLI
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
	case 'list':
		await listOutdated(args.includes('--major'))
		break

	case 'update': {
		const includeMajor = args.includes('--major')
		const all = args.includes('--all') || includeMajor
		const packages = args.slice(1).filter((a) => !a.startsWith('--'))

		if (packages.length > 0) {
			await updatePackages({ packages, target: 'latest', upgrade: true })
		} else if (all) {
			await updatePackages({ target: includeMajor ? 'latest' : 'minor', upgrade: true })
		} else {
			console.log('❌ Specify packages to update or use --all/--major\n')
			printHelp()
		}
		break
	}

	case 'sync':
		await syncVersions()
		break

	case 'help':
	case '--help':
	case '-h':
		printHelp()
		break

	default:
		if (command) {
			console.log(`❌ Unknown command: ${command}\n`)
		}
		printHelp()
}
