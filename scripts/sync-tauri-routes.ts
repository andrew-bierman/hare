#!/usr/bin/env bun
/**
 * Sync Routes from Web to Tauri
 *
 * This script analyzes web routes and generates corresponding Tauri route wrappers.
 * It detects routes using shared @hare/app/pages components and creates thin wrappers.
 *
 * Usage:
 *   bun run scripts/sync-tauri-routes.ts [--dry-run] [--verbose] [--force]
 *
 * Options:
 *   --dry-run   Preview changes without writing files
 *   --verbose   Show detailed output
 *   --force     Overwrite existing Tauri routes
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, join, relative } from 'path'

// Configuration
const WEB_ROUTES_DIR = join(import.meta.dir, '../apps/web/src/routes')
const TAURI_ROUTES_DIR = join(import.meta.dir, '../apps/tauri/src/routes')
const DASHBOARD_PREFIX = '_dashboard/dashboard'

// Known shared page components from @hare/app/pages
const SHARED_PAGES: Record<string, SharedPageConfig> = {
	DashboardHome: {
		import: "import { DashboardHome } from '@hare/app/pages'",
		routeProps: {},
	},
	AgentsPage: {
		import: "import { AgentsPage } from '@hare/app/pages'",
		routeProps: {
			newAgent: '/agents/new',
			agentDetail: '(id) => `/agents/${id}`',
		},
	},
	AgentCreatePage: {
		import: "import { AgentCreatePage } from '@hare/app/pages'",
		routeProps: {},
		// AgentCreatePage doesn't need route props - uses internal navigation
	},
	ToolsPage: {
		import: "import { ToolsPage } from '@hare/app/pages'",
		routeProps: {
			newTool: '/tools/new',
			toolDetail: '(id) => `/tools/${id}`',
		},
	},
	SettingsPage: {
		import: "import { SettingsPage } from '@hare/app/pages'",
		routeProps: {
			billing: '/settings/billing',
			team: '/settings/team',
			apiKeys: '/settings/api-keys',
		},
	},
}

interface SharedPageConfig {
	import: string
	routeProps: Record<string, string>
	useNavigateCallbacks?: boolean
}

interface RouteAnalysis {
	webPath: string
	relativePath: string
	tauriPath: string
	tauriRoutePath: string
	usesSharedPage: boolean
	sharedPageName?: string
	requiresMigration: boolean
	status: 'synced' | 'needs-update' | 'needs-migration' | 'new'
	reason?: string
}

interface SyncResult {
	analyzed: RouteAnalysis[]
	synced: string[]
	skipped: string[]
	alreadyExists: string[]
	needsMigration: string[]
}

// Parse command line args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')
const force = args.includes('--force')

function log(message: string) {
	console.log(message)
}

function logVerbose(message: string) {
	if (verbose) console.log(`  ${message}`)
}

/**
 * Recursively find all .tsx route files
 */
function findRouteFiles(dir: string, files: string[] = []): string[] {
	if (!existsSync(dir)) return files

	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry)
		const stat = statSync(fullPath)

		if (stat.isDirectory()) {
			findRouteFiles(fullPath, files)
		} else if (entry.endsWith('.tsx') && !entry.startsWith('_')) {
			files.push(fullPath)
		}
	}

	return files
}

/**
 * Detect if a web route file uses a shared page component
 */
function detectSharedPage(content: string): string | null {
	for (const pageName of Object.keys(SHARED_PAGES)) {
		// Check for import from @hare/app/pages
		if (content.includes(`import { ${pageName}`) && content.includes('@hare/app/pages')) {
			return pageName
		}
		// Also check if it's used in JSX
		if (content.includes(`<${pageName}`)) {
			return pageName
		}
	}
	return null
}

/**
 * Convert web route path to Tauri route path
 * e.g., _dashboard/dashboard/agents/index.tsx -> /agents
 */
function webPathToTauriRoute(webRelPath: string): string {
	let route = webRelPath
		// Remove dashboard prefix
		.replace(DASHBOARD_PREFIX + '/', '')
		// Remove .tsx extension
		.replace('.tsx', '')
		// Remove index
		.replace(/\/index$/, '')
		// Handle root index
		.replace(/^index$/, '')

	// Ensure leading slash
	if (!route.startsWith('/')) {
		route = '/' + route
	}

	// Root becomes /
	if (route === '/') {
		return '/'
	}

	return route
}

/**
 * Convert Tauri route path to filename
 * e.g., /agents/$id -> agents/$id.tsx
 */
function tauriRouteToFilename(routePath: string): string {
	const path = routePath.replace(/^\//, '') || 'index'
	return path + '.tsx'
}

/**
 * Generate Tauri route wrapper code
 */
function generateTauriRouteWrapper(opts: {
	routePath: string
	sharedPageName: string
	hasRouteProps: boolean
}): string {
	const { routePath, sharedPageName, hasRouteProps } = opts
	const config = SHARED_PAGES[sharedPageName]
	const wrapperName = `${sharedPageName}Wrapper`

	// Build route props object
	let routePropsCode = ''
	if (hasRouteProps && Object.keys(config.routeProps).length > 0) {
		const propsEntries = Object.entries(config.routeProps)
			.map(([key, value]) => {
				// If it's a function, don't quote it
				if (value.startsWith('(')) {
					return `\t\t\t\t${key}: ${value},`
				}
				return `\t\t\t\t${key}: '${value}',`
			})
			.join('\n')
		routePropsCode = `\n\t\t\troutes={{\n${propsEntries}\n\t\t\t}}`
	}

	return `${config.import}
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('${routePath}')({
	component: ${wrapperName},
})

function ${wrapperName}() {
	return (
		<${sharedPageName}
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}${routePropsCode}
		/>
	)
}
`
}

/**
 * Analyze all web routes and determine sync status
 */
function analyzeRoutes(): RouteAnalysis[] {
	const webRoutes = findRouteFiles(WEB_ROUTES_DIR)
	const analyses: RouteAnalysis[] = []

	for (const webPath of webRoutes) {
		const relativePath = relative(WEB_ROUTES_DIR, webPath)

		// Skip auth routes (not applicable to Tauri)
		if (relativePath.startsWith('_auth')) {
			logVerbose(`Skipping auth route: ${relativePath}`)
			continue
		}

		// Skip embed routes (web-only)
		if (relativePath.startsWith('embed')) {
			logVerbose(`Skipping embed route: ${relativePath}`)
			continue
		}

		// Skip root layout files
		if (relativePath === '__root.tsx' || relativePath === '_dashboard.tsx') {
			logVerbose(`Skipping layout: ${relativePath}`)
			continue
		}

		// Skip non-dashboard routes that aren't index
		if (!relativePath.startsWith(DASHBOARD_PREFIX) && relativePath !== 'index.tsx') {
			logVerbose(`Skipping non-dashboard route: ${relativePath}`)
			continue
		}

		const content = readFileSync(webPath, 'utf-8')
		const sharedPageName = detectSharedPage(content)
		const tauriRoutePath = webPathToTauriRoute(relativePath)
		const tauriFilename = tauriRouteToFilename(tauriRoutePath)
		const tauriPath = join(TAURI_ROUTES_DIR, tauriFilename)

		const analysis: RouteAnalysis = {
			webPath,
			relativePath,
			tauriPath,
			tauriRoutePath,
			usesSharedPage: !!sharedPageName,
			sharedPageName: sharedPageName || undefined,
			requiresMigration: !sharedPageName,
			status: 'new',
		}

		// Determine status
		if (existsSync(tauriPath)) {
			const tauriContent = readFileSync(tauriPath, 'utf-8')
			if (sharedPageName && tauriContent.includes(sharedPageName)) {
				analysis.status = 'synced'
			} else {
				analysis.status = 'needs-update'
			}
		} else if (!sharedPageName) {
			analysis.status = 'needs-migration'
			analysis.reason = 'Route does not use @hare/app/pages - needs to be migrated first'
		} else {
			analysis.status = 'new'
		}

		analyses.push(analysis)
	}

	return analyses
}

/**
 * Sync routes from web to Tauri
 */
function syncRoutes(analyses: RouteAnalysis[]): SyncResult {
	const result: SyncResult = {
		analyzed: analyses,
		synced: [],
		skipped: [],
		alreadyExists: [],
		needsMigration: [],
	}

	for (const analysis of analyses) {
		if (analysis.status === 'needs-migration') {
			result.needsMigration.push(analysis.relativePath)
			continue
		}

		if (!analysis.sharedPageName) {
			result.skipped.push(analysis.relativePath)
			continue
		}

		// Check if Tauri route already exists
		if (existsSync(analysis.tauriPath) && !force) {
			result.alreadyExists.push(analysis.tauriRoutePath)
			logVerbose(`Already exists (use --force to overwrite): ${basename(analysis.tauriPath)}`)
			continue
		}

		// Generate wrapper code
		const code = generateTauriRouteWrapper({
			routePath: analysis.tauriRoutePath,
			sharedPageName: analysis.sharedPageName,
			hasRouteProps: true,
		})

		// Ensure directory exists
		const dir = dirname(analysis.tauriPath)
		if (!existsSync(dir)) {
			if (!dryRun) {
				mkdirSync(dir, { recursive: true })
			}
			logVerbose(`Creating directory: ${relative(TAURI_ROUTES_DIR, dir)}`)
		}

		// Write file
		if (!dryRun) {
			writeFileSync(analysis.tauriPath, code)
		}

		result.synced.push(analysis.tauriRoutePath)
		logVerbose(`${dryRun ? 'Would create' : 'Created'}: ${basename(analysis.tauriPath)}`)
	}

	return result
}

/**
 * Find existing Tauri routes that aren't in web
 */
function findTauriOnlyRoutes(): string[] {
	const tauriRoutes = findRouteFiles(TAURI_ROUTES_DIR)
	const webRoutes = findRouteFiles(WEB_ROUTES_DIR)

	// Get all web route paths (normalized)
	const webRoutePaths = new Set(
		webRoutes.map((p) => {
			const rel = relative(WEB_ROUTES_DIR, p)
			return webPathToTauriRoute(rel)
		}),
	)

	const tauriOnly: string[] = []
	for (const tauriPath of tauriRoutes) {
		const filename = basename(tauriPath, '.tsx')
		if (filename === '__root') continue

		const routePath = filename === 'index' ? '/' : `/${filename}`
		if (!webRoutePaths.has(routePath)) {
			tauriOnly.push(routePath)
		}
	}

	return tauriOnly
}

/**
 * Print summary report
 */
function printReport(result: SyncResult) {
	console.log('\n' + '='.repeat(60))
	console.log('ROUTE SYNC REPORT')
	console.log('='.repeat(60))

	if (dryRun) {
		console.log('\n[DRY RUN MODE - No files modified]\n')
	}

	// Synced routes
	console.log(`\n✅ SYNCED/CREATED (${result.synced.length}):`)
	if (result.synced.length === 0) {
		console.log('   (none)')
	} else {
		for (const route of result.synced) {
			console.log(`   ${route}`)
		}
	}

	// Already exists
	console.log(`\n📁 ALREADY EXISTS IN TAURI (${result.alreadyExists.length}):`)
	if (result.alreadyExists.length === 0) {
		console.log('   (none)')
	} else {
		for (const route of result.alreadyExists) {
			console.log(`   ${route}`)
		}
		if (!force) {
			console.log('   (use --force to overwrite)')
		}
	}

	// Routes needing migration
	console.log(`\n⚠️  NEEDS MIGRATION TO @hare/app/pages (${result.needsMigration.length}):`)
	if (result.needsMigration.length === 0) {
		console.log('   (none - all routes use shared components)')
	} else {
		console.log('   These routes have full implementations in web and need to be')
		console.log('   extracted to @hare/app/pages before they can be synced:\n')
		for (const route of result.needsMigration) {
			console.log(`   - ${route}`)
		}
	}

	// Tauri-only routes
	const tauriOnly = findTauriOnlyRoutes()
	if (tauriOnly.length > 0) {
		console.log(`\n🖥️  TAURI-ONLY ROUTES (${tauriOnly.length}):`)
		for (const route of tauriOnly) {
			console.log(`   ${route}`)
		}
	}

	// Summary
	console.log('\n' + '-'.repeat(60))
	console.log('SUMMARY:')
	console.log(`   Total web routes analyzed: ${result.analyzed.length}`)
	console.log(`   Created/Updated:           ${result.synced.length}`)
	console.log(`   Already in Tauri:          ${result.alreadyExists.length}`)
	console.log(`   Needs migration:           ${result.needsMigration.length}`)
	console.log(`   Skipped (auth/embed):      ${result.skipped.length}`)

	if (result.needsMigration.length > 0) {
		console.log('\n💡 TIP: To add missing routes to Tauri:')
		console.log('   1. Extract the component to packages/app/src/pages/')
		console.log('   2. Export it from packages/app/src/pages/index.ts')
		console.log('   3. Update the web route to use the shared component')
		console.log('   4. Run this script again')
	}

	console.log('')
}

// Main execution
console.log('🔄 Syncing routes from web to Tauri...\n')

const analyses = analyzeRoutes()
const result = syncRoutes(analyses)
printReport(result)

if (!dryRun && result.synced.length > 0) {
	console.log('✨ Done! Run `bun run dev` in apps/tauri to test.\n')
}
