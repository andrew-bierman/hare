// Simple docs system - no fumadocs, just MDX + Vite
// MDX files are compiled at build time via @mdx-js/rollup

import type { ComponentType } from 'react'

export interface DocPage {
	slug: string
	title: string
	description?: string
	category?: string
	order?: number
	Component: ComponentType
}

export interface DocCategory {
	name: string
	slug: string
	pages: DocPage[]
}

// Type for MDX module from Vite's import.meta.glob
interface MdxModule {
	default: ComponentType
	frontmatter?: {
		title?: string
		description?: string
		order?: number
	}
}

// Import all MDX files at build time using Vite's glob import
// Type assertion needed because tsgo doesn't always pick up vite/client types
const mdxModules = (
	import.meta as unknown as {
		glob: <T>(pattern: string, options: { eager: true }) => Record<string, T>
	}
).glob<MdxModule>('/content/**/*.mdx', { eager: true })

// Parse slug from file path
function getSlugFromPath(path: string): string {
	return path
		.replace('/content/', '')
		.replace(/\.mdx$/, '')
		.replace(/\/index$/, '')
}

// Get category from path
function getCategoryFromPath(path: string): string | undefined {
	const parts = path.replace('/content/', '').split('/')
	if (parts.length > 1) {
		return parts[0]
	}
	return undefined
}

// Build the docs index
function buildDocsIndex(): Map<string, DocPage> {
	const docs = new Map<string, DocPage>()

	for (const [path, module] of Object.entries(mdxModules)) {
		const slug = getSlugFromPath(path)
		const category = getCategoryFromPath(path)
		const frontmatter = module.frontmatter || {}

		docs.set(slug, {
			slug,
			title: frontmatter.title || slug.split('/').pop() || 'Untitled',
			description: frontmatter.description,
			category,
			order: frontmatter.order,
			Component: module.default,
		})
	}

	return docs
}

// Lazy initialize
let docsIndex: Map<string, DocPage> | null = null

export function getDocsIndex(): Map<string, DocPage> {
	if (!docsIndex) {
		docsIndex = buildDocsIndex()
	}
	return docsIndex
}

export function getDocPage(slug: string): DocPage | undefined {
	const index = getDocsIndex()
	// Try exact match first
	if (index.has(slug)) {
		return index.get(slug)
	}
	// Try with /index suffix for category pages
	if (index.has(`${slug}/index`)) {
		return index.get(`${slug}/index`)
	}
	// Empty slug = index page
	if (!slug || slug === '/') {
		return index.get('index') || index.get('')
	}
	return undefined
}

export function getAllDocPages(): DocPage[] {
	return Array.from(getDocsIndex().values())
}

// Get organized categories for sidebar
export function getDocCategories(): DocCategory[] {
	const pages = getAllDocPages()
	const categoryMap = new Map<string, DocPage[]>()

	// Group by category
	for (const page of pages) {
		const cat = page.category || 'root'
		if (!categoryMap.has(cat)) {
			categoryMap.set(cat, [])
		}
		// biome-ignore lint/style/noNonNullAssertion: key existence checked by has() above
		categoryMap.get(cat)!.push(page)
	}

	// Sort pages within categories
	for (const pages of categoryMap.values()) {
		pages.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
	}

	// Build category list
	const categories: DocCategory[] = []

	// Root pages first (no category)
	const rootPages = categoryMap.get('root') || []
	if (rootPages.length > 0) {
		categories.push({
			name: 'Overview',
			slug: '',
			pages: rootPages,
		})
	}

	// Category names
	const categoryNames: Record<string, string> = {
		guides: 'Guides',
		sdk: 'SDK Reference',
		api: 'API Reference',
	}

	// Add other categories
	const categoryOrder = ['guides', 'sdk', 'api']
	for (const cat of categoryOrder) {
		const pages = categoryMap.get(cat)
		if (pages && pages.length > 0) {
			categories.push({
				name: categoryNames[cat] || cat,
				slug: cat,
				pages,
			})
		}
	}

	return categories
}
