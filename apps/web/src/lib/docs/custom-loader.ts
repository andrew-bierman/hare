/**
 * Custom docs loader that avoids fumadocs-mdx runtime (which has path module issues).
 * Uses Vite's import.meta.glob directly for browser-safe MDX loading.
 *
 * Compatible with fumadocs-core page tree types and fumadocs-ui components.
 */

import type { ComponentType, ReactNode } from 'react'
import type { Root, Folder, Item, Node } from 'fumadocs-core/page-tree'

interface DocFrontmatter {
	title: string
	description?: string
	icon?: string
}

interface DocModule {
	default: ComponentType
	frontmatter: DocFrontmatter
	toc: { title: string; url: string; depth: number }[]
}

// Type for the glob result
type GlobModules = Record<string, () => Promise<DocModule>>

// Import all MDX files from content directory
// Path is relative from src/lib/docs/ to apps/web/content/
// Using eager: false for lazy loading on client
const mdxModules = import.meta.glob<DocModule>('../../../content/**/*.mdx', {
	eager: false,
}) as GlobModules

// Also load eagerly for SSR page tree building
const mdxModulesEager = import.meta.glob<DocModule>('../../../content/**/*.mdx', {
	eager: true,
})

/**
 * Parse a file path to get the slug parts
 * e.g., "../../../content/guides/getting-started.mdx" -> ["guides", "getting-started"]
 */
function pathToSlugs(filePath: string): string[] {
	// Remove the prefix and extension
	const match = filePath.match(/\.\.\/\.\.\/\.\.\/content\/(.+)\.mdx$/)
	if (!match) return []

	const pathPart = match[1]

	// Handle index files
	if (pathPart === 'index') return []
	if (pathPart.endsWith('/index')) {
		return pathPart.slice(0, -6).split('/')
	}

	return pathPart.split('/')
}

/**
 * Convert slugs to a URL path
 */
function slugsToPath(slugs: string[]): string {
	if (slugs.length === 0) return ''
	return '/' + slugs.join('/')
}

// Build the pages map
interface PageEntry {
	filePath: string
	slugs: string[]
	frontmatter?: DocFrontmatter
}

const pagesMap = new Map<string, PageEntry>()

for (const [filePath, mod] of Object.entries(mdxModulesEager)) {
	const slugs = pathToSlugs(filePath)
	const path = slugsToPath(slugs)
	pagesMap.set(path, {
		filePath,
		slugs,
		frontmatter: mod.frontmatter,
	})
}

/**
 * Get a doc page by slug array
 */
export function getPage(slugs: string[]): { path: string; slugs: string[]; url: string } | null {
	const path = slugsToPath(slugs)
	const entry = pagesMap.get(path)
	if (!entry) return null
	return { path, slugs: entry.slugs, url: '/docs' + path }
}

/**
 * Load a doc page's content (lazy)
 */
export async function loadPage(path: string): Promise<DocModule | null> {
	const entry = pagesMap.get(path)
	if (!entry) return null

	const loader = mdxModules[entry.filePath]
	if (!loader) return null

	return await loader()
}

/**
 * Get page frontmatter (sync, for building page tree)
 */
export function getPageFrontmatter(path: string): DocFrontmatter | undefined {
	return pagesMap.get(path)?.frontmatter
}

/**
 * Get all pages (for building page tree)
 */
export function getAllPages(): Array<{ path: string; slugs: string[]; frontmatter?: DocFrontmatter }> {
	return Array.from(pagesMap.entries()).map(([path, entry]) => ({
		path,
		slugs: entry.slugs,
		frontmatter: entry.frontmatter,
	}))
}

/**
 * Build a page tree in fumadocs-core format
 */
export function buildPageTree(): Root {
	const pages = getAllPages()

	// Group pages by folder
	const folders = new Map<string, { index?: PageEntry & { path: string }; children: Array<PageEntry & { path: string }> }>()
	const topLevelPages: Array<PageEntry & { path: string }> = []
	let rootIndex: (PageEntry & { path: string }) | undefined

	// Sort pages for consistent ordering
	pages.sort((a, b) => a.path.localeCompare(b.path))

	for (const page of pages) {
		const pageWithPath = { ...pagesMap.get(page.path)!, path: page.path }

		if (page.slugs.length === 0) {
			// Root index
			rootIndex = pageWithPath
		} else if (page.slugs.length === 1) {
			// Top-level page
			topLevelPages.push(pageWithPath)
		} else {
			// Nested page
			const folderSlug = page.slugs[0]
			if (!folders.has(folderSlug)) {
				folders.set(folderSlug, { children: [] })
			}
			const folder = folders.get(folderSlug)!

			// Check if this is an index page for the folder
			if (page.slugs.length === 2 && page.slugs[1] === 'index') {
				folder.index = pageWithPath
			} else {
				folder.children.push(pageWithPath)
			}
		}
	}

	// Build the tree nodes
	const children: Node[] = []

	// Add root index first if it exists
	if (rootIndex) {
		children.push({
			type: 'page' as const,
			name: rootIndex.frontmatter?.title || 'Home',
			url: '/docs',
		})
	}

	// Add folders
	for (const [folderSlug, folder] of folders) {
		const folderName = folderSlug.charAt(0).toUpperCase() + folderSlug.slice(1)
		const folderNode: Folder = {
			type: 'folder' as const,
			name: folderName,
			children: folder.children.map((p): Item => ({
				type: 'page' as const,
				name: p.frontmatter?.title || p.slugs[p.slugs.length - 1],
				url: '/docs' + p.path,
			})),
		}

		// Add index page if exists
		if (folder.index) {
			folderNode.index = {
				type: 'page' as const,
				name: folder.index.frontmatter?.title || folderName,
				url: '/docs' + folder.index.path,
			}
		}

		children.push(folderNode)
	}

	// Add top-level pages
	for (const page of topLevelPages) {
		children.push({
			type: 'page' as const,
			name: page.frontmatter?.title || page.slugs[0],
			url: '/docs' + page.path,
		})
	}

	return {
		name: 'Docs',
		children,
	}
}

// Pre-built page tree (static)
export const pageTree: Root = buildPageTree()

/**
 * Serialize page tree for SSR transfer
 * Convert ReactNode names to strings for JSON serialization
 */
export function serializePageTree(tree: Root): object {
	function serializeNode(node: Node): object {
		if (node.type === 'page') {
			return {
				type: 'page',
				name: String(node.name),
				url: node.url,
				description: node.description ? String(node.description) : undefined,
			}
		} else if (node.type === 'folder') {
			return {
				type: 'folder',
				name: String(node.name),
				index: node.index ? serializeNode(node.index) : undefined,
				children: node.children.map(serializeNode),
			}
		} else {
			// separator
			return {
				type: 'separator',
				name: node.name ? String(node.name) : undefined,
			}
		}
	}

	return {
		name: String(tree.name),
		children: tree.children.map(serializeNode),
	}
}

/**
 * Create a source object compatible with fumadocs patterns
 */
export const source = {
	getPage,
	loadPage,
	pageTree,
	serializePageTree: (tree: Root) => Promise.resolve(serializePageTree(tree)),
}
