import { defineConfig, defineDocs } from 'fumadocs-mdx/config'

// Simplified config without fumadocs-typescript (which uses node:path)
// This avoids client-side bundling issues with Node.js modules

export const docs = defineDocs({
	// Content lives in apps/web/content
	dir: './content',
})

export default defineConfig()
