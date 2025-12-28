#!/usr/bin/env bun
/**
 * Sync Web to Tauri
 *
 * Syncs routes, components, and config from web app to Tauri.
 * Tauri is essentially web in SPA mode with adjusted imports.
 *
 * Usage:
 *   bun run scripts/sync-tauri.ts [options]
 *
 * Options:
 *   --dry-run      Preview changes without writing files
 *   --verbose      Show detailed output
 *   --force        Overwrite existing files
 *   --routes       Sync routes only
 *   --components   Sync components only
 *   --config       Sync vite config only
 *   --all          Sync everything (default)
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, join, relative } from 'path'

// =============================================================================
// Configuration
// =============================================================================

const ROOT = join(import.meta.dir, '..')
const WEB_DIR = join(ROOT, 'apps/web')
const TAURI_DIR = join(ROOT, 'apps/tauri')
const WEB_ROUTES = join(WEB_DIR, 'src/routes')
const TAURI_ROUTES = join(TAURI_DIR, 'src/routes')
const WEB_COMPONENTS = join(WEB_DIR, 'src/components')
const TAURI_COMPONENTS = join(TAURI_DIR, 'src/components')

// Import transformations for routes
const IMPORT_TRANSFORMS: Array<[RegExp, string]> = [
	// web-app/app -> @hare/app/providers (for WorkspaceProvider, useWorkspace)
	[/from\s+['"]web-app\/app['"]/g, "from '@hare/app/providers'"],
	// web-app/components/router -> local components
	[/from\s+['"]web-app\/components\/router['"]/g, "from '../components/router'"],
	// web-app/lib/api/hooks -> @hare/app/shared/api
	[/from\s+['"]web-app\/lib\/api\/hooks['"]/g, "from '@hare/app/shared/api'"],
	// web-app/lib/* -> @hare/app/shared/lib
	[/from\s+['"]web-app\/lib\/[^'"]+['"]/g, "from '@hare/app/shared/lib'"],
	// web-app/* -> comment out (needs manual review)
	[/(import\s+.*from\s+['"]web-app\/[^'"]+['"])/g, '// TODO: Fix import - $1'],
]

// Routes to skip (web-only features or Tauri-specific)
const SKIP_ROUTE_PATTERNS = [
	'__root.tsx', // Root layout (Tauri has its own)
	'_auth/', // Auth routes (login/signup)
	'_auth.tsx', // Auth layout
	'embed/', // Embed routes
	'embed.tsx', // Embed layout
	'/api/', // API routes
]

// Components to sync (whitelist - only sync these)
const SYNC_COMPONENT_PATTERNS = [
	'router/', // Router components (error, not-found, pending)
]

// Components to skip
const SKIP_COMPONENT_PATTERNS = [
	'ui/', // UI components come from @hare/ui
]

// =============================================================================
// CLI Args
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')
const force = args.includes('--force')
const syncRoutesOnly = args.includes('--routes')
const syncComponentsOnly = args.includes('--components')
const syncConfigOnly = args.includes('--config')
const syncAll = args.includes('--all') || (!syncRoutesOnly && !syncComponentsOnly && !syncConfigOnly)

// =============================================================================
// Utilities
// =============================================================================

function log(msg: string) {
	console.log(msg)
}

function logVerbose(msg: string) {
	if (verbose) console.log(`  ${msg}`)
}

function findFiles(dir: string, extensions: string | string[] = '.tsx'): string[] {
	if (!existsSync(dir)) return []
	const files: string[] = []
	const exts = Array.isArray(extensions) ? extensions : [extensions]

	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry)
		const stat = statSync(fullPath)
		if (stat.isDirectory()) {
			files.push(...findFiles(fullPath, exts))
		} else if (exts.some((ext) => entry.endsWith(ext))) {
			files.push(fullPath)
		}
	}
	return files
}

function ensureDir(dir: string) {
	if (!existsSync(dir)) {
		if (!dryRun) mkdirSync(dir, { recursive: true })
		logVerbose(`Created directory: ${relative(ROOT, dir)}`)
	}
}

// =============================================================================
// Route Sync
// =============================================================================

function transformRouteContent(content: string, webRelPath: string): string {
	let result = content

	// Apply import transformations
	for (const [pattern, replacement] of IMPORT_TRANSFORMS) {
		result = result.replace(pattern, replacement)
	}

	// Remove SSR-specific imports
	result = result.replace(/import\s*{\s*createServerFn\s*}\s*from\s*['"][^'"]+['"]\s*;?\n?/g, '')

	// Remove createServerFn calls (multi-line)
	result = result.replace(/const\s+\w+\s*=\s*createServerFn\([^)]*\)[\s\S]*?(?=\n\n|\nexport|\nfunction)/g, '')

	return result
}

function shouldSkipRoute(relPath: string): boolean {
	return SKIP_ROUTE_PATTERNS.some((p) => relPath.includes(p))
}

function syncRoutes() {
	log('\n📁 SYNCING ROUTES')
	log('─'.repeat(50))

	const webRouteFiles = findFiles(WEB_ROUTES)
	const stats = { synced: 0, skipped: 0, existing: 0 }

	for (const webPath of webRouteFiles) {
		const relPath = relative(WEB_ROUTES, webPath)

		// Skip web-only routes
		if (shouldSkipRoute(relPath)) {
			logVerbose(`Skipped (web-only): ${relPath}`)
			stats.skipped++
			continue
		}

		const tauriPath = join(TAURI_ROUTES, relPath)

		// Check if already exists
		if (existsSync(tauriPath) && !force) {
			logVerbose(`Exists: ${relPath}`)
			stats.existing++
			continue
		}

		// Read and transform
		const content = readFileSync(webPath, 'utf-8')
		const transformed = transformRouteContent(content, relPath)

		// Write
		ensureDir(dirname(tauriPath))
		if (!dryRun) {
			writeFileSync(tauriPath, transformed)
		}
		log(`  ${dryRun ? 'Would sync' : 'Synced'}: ${relPath}`)
		stats.synced++
	}

	log(`\n  Summary: ${stats.synced} synced, ${stats.existing} existing, ${stats.skipped} skipped`)
	if (!force && stats.existing > 0) {
		log('  (use --force to overwrite existing files)')
	}
}

// =============================================================================
// Component Sync
// =============================================================================

function shouldSyncComponent(relPath: string): boolean {
	// Only sync components that match the whitelist patterns
	return SYNC_COMPONENT_PATTERNS.some((p) => relPath.startsWith(p))
}

function transformComponentContent(content: string): string {
	let result = content

	// Apply same import transformations as routes
	for (const [pattern, replacement] of IMPORT_TRANSFORMS) {
		result = result.replace(pattern, replacement)
	}

	return result
}

function syncComponents() {
	log('\n🧩 SYNCING COMPONENTS')
	log('─'.repeat(50))

	const webComponentFiles = findFiles(WEB_COMPONENTS, ['.tsx', '.ts'])
	const stats = { synced: 0, skipped: 0, existing: 0 }

	for (const webPath of webComponentFiles) {
		const relPath = relative(WEB_COMPONENTS, webPath)

		// Only sync whitelisted components
		if (!shouldSyncComponent(relPath)) {
			logVerbose(`Skipped (not in whitelist): ${relPath}`)
			stats.skipped++
			continue
		}

		const tauriPath = join(TAURI_COMPONENTS, relPath)

		// Check if already exists
		if (existsSync(tauriPath) && !force) {
			logVerbose(`Exists: ${relPath}`)
			stats.existing++
			continue
		}

		// Read and transform
		const content = readFileSync(webPath, 'utf-8')
		const transformed = transformComponentContent(content)

		// Write
		ensureDir(dirname(tauriPath))
		if (!dryRun) {
			writeFileSync(tauriPath, transformed)
		}
		log(`  ${dryRun ? 'Would sync' : 'Synced'}: ${relPath}`)
		stats.synced++
	}

	log(`\n  Summary: ${stats.synced} synced, ${stats.existing} existing, ${stats.skipped} skipped`)
	if (!force && stats.existing > 0) {
		log('  (use --force to overwrite existing files)')
	}
}

// =============================================================================
// Config Sync
// =============================================================================

function syncViteConfig() {
	log('\n⚙️  SYNCING VITE CONFIG')
	log('─'.repeat(50))

	const webConfig = readFileSync(join(WEB_DIR, 'vite.config.ts'), 'utf-8')

	// Extract aliases from web config
	const aliasMatch = webConfig.match(/resolve:\s*{\s*alias:\s*{([\s\S]*?)}\s*}/m)
	if (!aliasMatch) {
		log('  ⚠️  Could not extract aliases from web vite.config.ts')
		return
	}

	const webAliases = aliasMatch[1]

	// Read current Tauri config
	const tauriConfigPath = join(TAURI_DIR, 'vite.config.ts')
	let tauriConfig = readFileSync(tauriConfigPath, 'utf-8')

	// Extract current Tauri aliases section
	const tauriAliasMatch = tauriConfig.match(/(resolve:\s*{\s*alias:\s*{)([\s\S]*?)(},?\s*},)/m)
	if (!tauriAliasMatch) {
		log('  ⚠️  Could not find alias section in Tauri vite.config.ts')
		return
	}

	// Build merged aliases (web aliases + Tauri-specific)
	// Parse web aliases and add Tauri-specific ones
	const tauriSpecificAliases = `
			'@': path.resolve(__dirname, './src'),
			'web-app': path.resolve(__dirname, './src'),`

	// Transform web-app alias to point to Tauri's src
	let mergedAliases = webAliases
		.replace(/'web-app':\s*path\.resolve\(__dirname,\s*'\.\/src'\)/, "'web-app': path.resolve(__dirname, './src')")

	// Add Tauri-specific @ alias if not present
	if (!mergedAliases.includes("'@':")) {
		mergedAliases = tauriSpecificAliases + mergedAliases
	}

	// Replace aliases in Tauri config
	const newTauriConfig = tauriConfig.replace(
		/(resolve:\s*{\s*alias:\s*{)([\s\S]*?)(}\s*},)/m,
		`$1${mergedAliases}$3`
	)

	if (newTauriConfig !== tauriConfig) {
		if (!dryRun) {
			writeFileSync(tauriConfigPath, newTauriConfig)
		}
		log(`  ${dryRun ? 'Would update' : 'Updated'}: vite.config.ts aliases`)
	} else {
		log('  ✓ Aliases already in sync')
	}
}

// =============================================================================
// Main
// =============================================================================

async function main() {
	console.log('🔄 SYNC WEB → TAURI')
	console.log('='.repeat(50))

	if (dryRun) {
		console.log('   [DRY RUN MODE - no files will be modified]\n')
	}

	if (syncAll || syncRoutesOnly) {
		syncRoutes()
	}

	if (syncAll || syncComponentsOnly) {
		syncComponents()
	}

	if (syncAll || syncConfigOnly) {
		syncViteConfig()
	}

	console.log('\n' + '='.repeat(50))
	console.log('✨ SYNC COMPLETE')

	if (!dryRun) {
		console.log('\nNext steps:')
		console.log('  1. Review synced files for TODO comments')
		console.log('  2. Run: bun run typecheck')
		console.log('  3. Test: cd apps/tauri && bun run dev')
	}
	console.log('')
}

main().catch(console.error)
