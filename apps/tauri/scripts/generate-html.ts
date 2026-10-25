/**
 * Package TanStack Start's prerendered SPA shell for Tauri.
 * The shell includes the router hydration state required by StartClient.
 */

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = join(import.meta.dirname, '../dist/client')
const outputDir = join(import.meta.dirname, '../dist/static')
const shellPath = join(clientDir, '_shell.html')

if (!existsSync(shellPath)) {
	throw new Error('Missing dist/client/_shell.html. Run the Vite SPA build before packaging Tauri.')
}

mkdirSync(outputDir, { recursive: true })
// Include public assets as well as bundles and preserve the generated hydration scripts.
cpSync(clientDir, outputDir, { recursive: true })
cpSync(shellPath, join(outputDir, 'index.html'))

console.log('✓ Packaged prerendered SPA shell for Tauri')
console.log(`  Output: ${outputDir}`)
