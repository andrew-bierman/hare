import { defineDocs, defineConfig } from 'fumadocs-mdx/config'

// Simplified config without fumadocs-typescript (which uses node:path)
// This avoids client-side bundling issues with Node.js modules

export const docs = defineDocs({
	// Content lives in packages/docs for better separation
	dir: '../../packages/docs/content',
})

export default defineConfig()
