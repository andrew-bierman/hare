import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { Plugin } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const polyfillPath = path.resolve(__dirname, 'path-browser.ts')

/**
 * Vite plugin that polyfills 'path' module ONLY for fumadocs packages.
 * This prevents breaking other parts of the app that need Node's path module.
 *
 * Uses both:
 * - esbuild plugin for pre-bundling phase (optimizeDeps)
 * - Vite resolveId for regular module resolution
 */
export function fumadocsPathPolyfill(): Plugin {
	return {
		name: 'fumadocs-path-polyfill',
		enforce: 'pre',

		// Hook into Vite's config to add esbuild plugin for pre-bundling
		config(config) {
			return {
				optimizeDeps: {
					esbuildOptions: {
						plugins: [
							{
								name: 'fumadocs-path-polyfill-esbuild',
								setup(build) {
									// Intercept 'path' imports only from fumadocs packages during pre-bundling
									build.onResolve({ filter: /^(node:)?path$/ }, (args) => {
										if (args.importer && isFumadocsImporter(args.importer)) {
											console.log(
												`[fumadocs-path-polyfill:esbuild] Polyfilling path for: ${args.importer}`,
											)
											return { path: polyfillPath }
										}
										return null
									})
								},
							},
						],
					},
				},
			}
		},

		// Also handle regular resolution for non-prebundled modules
		resolveId(id, importer, options) {
			// Only intercept 'path' imports from fumadocs packages in client/browser context
			if ((id === 'path' || id === 'node:path') && importer) {
				const isSSR = options?.ssr ?? false
				const isFumadocs = isFumadocsImporter(importer)

				// For client builds, polyfill path for fumadocs
				if (!isSSR && isFumadocs) {
					console.log(`[fumadocs-path-polyfill:vite] Polyfilling path for: ${importer}`)
					return polyfillPath
				}
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
