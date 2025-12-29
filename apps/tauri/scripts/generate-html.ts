/**
 * Temporary workaround for TanStack Start static prerendering issue
 * https://github.com/TanStack/router/issues/4369
 *
 * This script generates index.html from the client build output.
 * Remove this when the upstream issue is fixed.
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = join(import.meta.dirname, '../dist/client')
const outputDir = join(import.meta.dirname, '../dist/static')

// Ensure output directory exists
if (!existsSync(outputDir)) {
	mkdirSync(outputDir, { recursive: true })
}

// Find the main JS and CSS files
const assets = readdirSync(join(clientDir, 'assets'))
const mainJs = assets.find((f) => f.startsWith('main-') && f.endsWith('.js'))
const mainCss = assets.find((f) => f.startsWith('main-') && f.endsWith('.css'))
const clientJs = assets.find((f) => f.startsWith('client-') && f.endsWith('.js'))

// CSS might be inlined or handled by the JS bundle in newer TanStack Start versions
if (!mainJs && !clientJs) {
	console.error('Could not find main or client JS in dist/client/assets')
	process.exit(1)
}

const entryJs = clientJs || mainJs

// Generate index.html
const cssLink = mainCss ? `<link rel="stylesheet" href="/assets/${mainCss}" />` : ''
const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Hare Desktop</title>
		${cssLink}
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/assets/${entryJs}"></script>
	</body>
</html>
`

writeFileSync(join(outputDir, 'index.html'), html)

// Copy assets directory (symlink would be better but this works cross-platform)
const { cpSync } = await import('node:fs')
cpSync(join(clientDir, 'assets'), join(outputDir, 'assets'), { recursive: true })

console.log('✓ Generated static HTML for Tauri')
console.log(`  Output: ${outputDir}`)
