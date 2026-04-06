#!/usr/bin/env node
/**
 * @hare/cli - CLI for scaffolding Hare AI agent projects
 *
 * Usage:
 *   npx @hare/cli init my-agent
 *   npx create-hare-agent my-agent
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TEMPLATES } from './templates'

function init(projectName: string) {
	const projectDir = join(process.cwd(), projectName)

	if (existsSync(projectDir)) {
		// biome-ignore lint/suspicious/noConsole: CLI output
		console.error(`Error: Directory "${projectName}" already exists.`)
		process.exit(1)
	}

	// biome-ignore lint/suspicious/noConsole: CLI output
	console.log(`Creating Hare agent project: ${projectName}`)

	// Create directories
	mkdirSync(projectDir, { recursive: true })
	mkdirSync(join(projectDir, 'src'), { recursive: true })

	// Write files
	for (const [filename, template] of Object.entries(TEMPLATES)) {
		const content = template(projectName)
		const filePath = join(projectDir, filename)
		writeFileSync(filePath, content)
		// biome-ignore lint/suspicious/noConsole: CLI output
		console.log(`  Created ${filename}`)
	}

	// biome-ignore lint/suspicious/noConsole: CLI output
	console.log(`
Done! Next steps:

  cd ${projectName}
  npm install
  npm run dev

Your agent will be running at http://localhost:8787
`)
}

// CLI entry point
const args = process.argv.slice(2)
const command = args[0]

if (command === 'init' && args[1]) {
	init(args[1])
} else if (command && command !== 'init') {
	// Assume it's a project name (for create-hare-agent usage)
	init(command)
} else {
	// biome-ignore lint/suspicious/noConsole: CLI output
	console.log(`
Usage:
  npx @hare/cli init <project-name>
  npx create-hare-agent <project-name>

Example:
  npx @hare/cli init my-agent
  cd my-agent
  npm install
  npm run dev
`)
}
