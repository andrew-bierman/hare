import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Vite plugin that polyfills 'path' module ONLY for fumadocs packages.
 * This prevents breaking other parts of the app that need Node's path module.
 */
export function fumadocsPathPolyfill(): Plugin {
	const polyfillPath = path.resolve(__dirname, 'path-browser.ts')

	return {
		name: 'fumadocs-path-polyfill',
		enforce: 'pre',
		resolveId(id, importer) {
			// Only intercept 'path' imports from fumadocs packages
			if (id === 'path' && importer && isFumadocsImporter(importer)) {
				return polyfillPath
			}
			return null
		},
	}
}

function isFumadocsImporter(importer: string): boolean {
	return (
		importer.includes('fumadocs-core') ||
		importer.includes('fumadocs-ui') ||
		importer.includes('fumadocs-mdx') ||
		importer.includes('.source/')
	)
}
