#!/usr/bin/env bun

/**
 * Worktree Development Setup Script
 *
 * This script automates the setup of a local development environment,
 * especially useful when working in git worktrees where multiple
 * instances may run simultaneously.
 *
 * Usage:
 *   bun run setup:worktree [--port N]
 *
 * Options:
 *   --port N          Use a specific port (default: auto-generated 3001-3099)
 *   --skip-deps       Skip dependency installation
 *   --skip-db         Skip database migration
 *   --help            Show this help message
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const rootDir = join(import.meta.dir, '..')
const args = process.argv.slice(2)

// Parse arguments
const showHelp = args.includes('--help') || args.includes('-h')
const skipDeps = args.includes('--skip-deps')
const skipDb = args.includes('--skip-db')
const portArg = args.find((_, i) => args[i - 1] === '--port')

if (showHelp) {
	console.log(`
Worktree Development Setup Script

Usage:
  bun run setup:worktree [options]

Options:
  --port N          Use a specific port (default: auto-generated 3001-3099)
  --skip-deps       Skip dependency installation
  --skip-db         Skip database migration
  --help            Show this help message

Examples:
  bun run setup:worktree              # Auto-detect port
  bun run setup:worktree --port 3050  # Use specific port
  bun run setup:worktree --skip-deps  # Skip bun install
`)
	process.exit(0)
}

console.log('\n🐇 Hare Worktree Setup\n')
console.log('='.repeat(50))

// Check if we're in a worktree
function checkWorktree(): { isWorktree: boolean; mainWorktree: string | null } {
	try {
		const result = execSync('git worktree list --porcelain', { encoding: 'utf-8' })
		const worktrees = result.split('\n\n').filter(Boolean)
		const isWorktree =
			worktrees.length > 1 ||
			!rootDir.includes(worktrees[0]?.split('\n')[0]?.replace('worktree ', '') || '')
		return { isWorktree, mainWorktree: worktrees[0]?.split('\n')[0]?.replace('worktree ', '') || null }
	} catch {
		return { isWorktree: false, mainWorktree: null }
	}
}

const { isWorktree, mainWorktree } = checkWorktree()
console.log(`📁 Working directory: ${rootDir}`)
console.log(`🌳 Git worktree: ${isWorktree ? 'Yes' : 'No (main worktree)'}`)
if (isWorktree && mainWorktree) {
	console.log(`   Main worktree: ${mainWorktree}`)
}
console.log('')

// Calculate port - API and app run on same port via Cloudflare Vite plugin
function calculatePort(): number {
	// Default port is 3000, worktrees get 3001-3099
	const defaultPort = 3000

	if (portArg) {
		const port = Number.parseInt(portArg, 10)
		if (port >= 1024 && port <= 65535) {
			return port
		}
		console.log('⚠️  Invalid port, using auto-generated value')
	}

	// If not a worktree, use default
	if (!isWorktree) {
		return defaultPort
	}

	// Generate a deterministic port offset from the directory path
	const hash = createHash('md5').update(rootDir).digest('hex')
	const offset = (Number.parseInt(hash.slice(0, 8), 16) % 99) + 1
	return defaultPort + offset
}

const port = calculatePort()

console.log('🔌 Port Configuration:')
console.log(`   Dev server port: ${port}`)
console.log(`   (API and app run on same port via Cloudflare Vite plugin)`)
console.log('')

// Step 1: Install dependencies
if (!skipDeps) {
	console.log('📦 Installing dependencies...')
	try {
		execSync('bun install', { cwd: rootDir, stdio: 'inherit' })
		console.log('✅ Dependencies installed\n')
	} catch (error) {
		console.error('❌ Failed to install dependencies')
		process.exit(1)
	}
} else {
	console.log('⏭️  Skipping dependency installation (--skip-deps)\n')
}

// Step 2: Check/create .env.local
const envLocalPath = join(rootDir, '.env.local')
const envExamplePath = join(rootDir, '.env.local.example')

if (!existsSync(envLocalPath)) {
	console.log('📝 Creating .env.local from template...')
	if (existsSync(envExamplePath)) {
		copyFileSync(envExamplePath, envLocalPath)
		console.log('✅ Created .env.local from .env.local.example')

		// Generate BETTER_AUTH_SECRET if not set
		let envContent = readFileSync(envLocalPath, 'utf-8')
		if (
			!envContent.includes('BETTER_AUTH_SECRET=') ||
			envContent.includes('BETTER_AUTH_SECRET=\n') ||
			envContent.includes('BETTER_AUTH_SECRET=$')
		) {
			console.log('🔐 Generating BETTER_AUTH_SECRET...')
			try {
				const secret = execSync('openssl rand -base64 32', { encoding: 'utf-8' }).trim()
				envContent = envContent.replace(/BETTER_AUTH_SECRET=.*/, `BETTER_AUTH_SECRET=${secret}`)
				writeFileSync(envLocalPath, envContent)
				console.log('✅ Generated BETTER_AUTH_SECRET')
			} catch {
				console.log('⚠️  Could not generate secret. Please set BETTER_AUTH_SECRET manually.')
			}
		}
	} else {
		console.log('⚠️  No .env.local.example found. Creating minimal .env.local...')
		try {
			const secret = execSync('openssl rand -base64 32', { encoding: 'utf-8' }).trim()
			writeFileSync(
				envLocalPath,
				`# Generated by setup-worktree.ts
BETTER_AUTH_SECRET=${secret}
BETTER_AUTH_URL=http://localhost:${port}
VITE_APP_URL=http://localhost:${port}
`
			)
			console.log('✅ Created minimal .env.local')
		} catch {
			console.error('❌ Failed to create .env.local')
			process.exit(1)
		}
	}
	console.log('')
} else {
	console.log('✅ .env.local already exists\n')
}

// Step 3: Update port in .env.local
console.log('🔧 Updating port configuration in .env.local...')
let envContent = readFileSync(envLocalPath, 'utf-8')

// Update BETTER_AUTH_URL
if (envContent.includes('BETTER_AUTH_URL=')) {
	envContent = envContent.replace(
		/BETTER_AUTH_URL=http:\/\/localhost:\d+/,
		`BETTER_AUTH_URL=http://localhost:${port}`
	)
} else {
	envContent += `\nBETTER_AUTH_URL=http://localhost:${port}`
}

// Update VITE_APP_URL
if (envContent.includes('VITE_APP_URL=')) {
	envContent = envContent.replace(
		/VITE_APP_URL=http:\/\/localhost:\d+/,
		`VITE_APP_URL=http://localhost:${port}`
	)
} else {
	envContent += `\nVITE_APP_URL=http://localhost:${port}`
}

writeFileSync(envLocalPath, envContent)
console.log('✅ Updated port configuration\n')

// Step 4: Regenerate environment files
console.log('🔄 Regenerating environment files...')
try {
	execSync('bun run scripts/env.ts', { cwd: rootDir, stdio: 'inherit' })
	console.log('')
} catch (error) {
	console.error('❌ Failed to regenerate environment files')
	process.exit(1)
}

// Step 5: Run database migrations
if (!skipDb) {
	console.log('🗄️  Running local database migrations...')
	try {
		execSync('bun run db:migrate:local', { cwd: rootDir, stdio: 'inherit' })
		console.log('✅ Database migrations complete\n')
	} catch (error) {
		console.log('⚠️  Database migration failed. You may need to run manually:')
		console.log('   bun run db:migrate:local\n')
	}
} else {
	console.log('⏭️  Skipping database migration (--skip-db)\n')
}

// Summary
console.log('='.repeat(50))
console.log('\n🎉 Setup Complete!\n')
console.log('To start the development server:')
console.log(`\n   PORT=${port} bun run dev\n`)
console.log('Your app will be available at:')
console.log(`   http://localhost:${port}\n`)

// Create a .worktree-config file for reference
const configPath = join(rootDir, '.worktree-config')
writeFileSync(
	configPath,
	`# Auto-generated worktree configuration
# Use these values when starting the dev server

PORT=${port}

# Start command:
# PORT=${port} bun run dev
`
)
console.log('💾 Saved configuration to .worktree-config\n')
