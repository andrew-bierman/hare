/**
 * Temporary workaround for TanStack Start static prerendering issue
 * https://github.com/TanStack/router/issues/4369
 *
 * This script generates index.html from the client build output.
 * Remove this when the upstream issue is fixed.
 */

import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
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

if (!mainJs || !mainCss) {
	console.error('Could not find main assets in dist/client/assets')
	process.exit(1)
}

// Generate index.html
const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Hare Desktop</title>
		<link rel="stylesheet" href="/assets/${mainCss}" />
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/assets/${clientJs || mainJs}"></script>
	</body>
</html>
`

writeFileSync(join(outputDir, 'index.html'), html)

// Copy assets directory (symlink would be better but this works cross-platform)
const { cpSync } = await import('node:fs')
cpSync(join(clientDir, 'assets'), join(outputDir, 'assets'), { recursive: true })

console.log('✓ Generated static HTML for Tauri')
console.log(`  Output: ${outputDir}`)
