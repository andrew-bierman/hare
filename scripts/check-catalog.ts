#!/usr/bin/env bun
/**
 * Checks that all dependencies appearing in 2+ workspace packages
 * are defined in the root catalog and referenced via "catalog:" protocol.
 *
 * Usage:
 *   bun run scripts/check-catalog.ts          # Check mode
 *   bun run scripts/check-catalog.ts --fix    # Auto-fix mode
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = import.meta.dir.replace('/scripts', '')
const rootPkgPath = join(ROOT, 'package.json')
const fix = process.argv.includes('--fix')

function findPackageJsons(dir: string): string[] {
	const results: string[] = []
	const pkgPath = join(dir, 'package.json')
	if (existsSync(pkgPath)) results.push(pkgPath)
	for (const entry of readdirSync(dir)) {
		if (['node_modules', 'dist', '.claude', '.git'].includes(entry)) continue
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) {
			results.push(...findPackageJsons(full))
		}
	}
	return results
}

interface DepInfo {
	version: string
	locations: { path: string; section: string }[]
}

const pkgPaths = findPackageJsons(ROOT)
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'))
const catalog: Record<string, string> = rootPkg.catalog || {}

// Track all deps across packages
const depMap = new Map<string, DepInfo>()

for (const pkgPath of pkgPaths) {
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
	const rel = relative(ROOT, pkgPath)

	for (const section of ['dependencies', 'devDependencies'] as const) {
		const deps = pkg[section]
		if (!deps) continue

		for (const [name, version] of Object.entries(deps) as [string, string][]) {
			if (version.startsWith('workspace:') || version === 'latest' || version === 'catalog:') continue

			const existing = depMap.get(name)
			if (existing) {
				existing.locations.push({ path: rel, section })
			} else {
				depMap.set(name, { version, locations: [{ path: rel, section }] })
			}
		}
	}
}

// Find deps in 2+ packages that aren't using catalog:
const violations: { name: string; version: string; locations: { path: string; section: string }[] }[] = []

for (const [name, info] of depMap) {
	if (info.locations.length >= 2) {
		violations.push({ name, version: info.version, locations: info.locations })
	}
}

if (violations.length === 0) {
	console.log('✅ All shared dependencies use catalog:')
	process.exit(0)
}

if (fix) {
	// Add missing entries to catalog
	for (const v of violations) {
		if (!catalog[v.name]) {
			catalog[v.name] = v.version
		}
	}

	// Sort and write catalog
	rootPkg.catalog = Object.fromEntries(
		Object.entries(catalog).sort((a, b) => a[0].localeCompare(b[0]))
	)
	writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, '\t') + '\n')

	// Update workspace packages
	for (const pkgPath of pkgPaths) {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
		let changed = false

		for (const section of ['dependencies', 'devDependencies'] as const) {
			if (!pkg[section]) continue
			for (const name of Object.keys(pkg[section])) {
				if (rootPkg.catalog[name] && !pkg[section][name].startsWith('workspace:') && pkg[section][name] !== 'catalog:') {
					pkg[section][name] = 'catalog:'
					changed = true
				}
			}
		}

		if (changed) {
			writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n')
			console.log(`  Fixed ${relative(ROOT, pkgPath)}`)
		}
	}

	console.log(`✅ Fixed ${violations.length} shared dependencies to use catalog:`)
	process.exit(0)
}

// Report violations
console.log(`❌ ${violations.length} shared dependencies should use catalog:\n`)
for (const v of violations) {
	console.log(`  ${v.name}@${v.version}`)
	for (const loc of v.locations) {
		console.log(`    → ${loc.path} (${loc.section})`)
	}
}
console.log(`\nRun \`bun run check-catalog:fix\` to fix`)
process.exit(1)
