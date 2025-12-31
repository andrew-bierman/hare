import { createFileRoute } from '@tanstack/react-router'
import type { Root, TreeNode } from 'fumadocs-core/page-tree'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { useState, useEffect, type ComponentType } from 'react'
import { getLayoutOptions } from '../../lib/docs/layout.shared'
import { getMDXComponents } from '../../lib/docs/mdx-components'
import '../../styles/docs.css'

// Static page tree - built at compile time from content folder structure
const pageTree: Root = {
	name: 'Docs',
	children: [
		{ type: 'page', name: 'Introduction', url: '/docs' },
		{
			type: 'folder',
			name: 'Guides',
			children: [
				{ type: 'page', name: 'Getting Started', url: '/docs/guides/getting-started' },
				{ type: 'page', name: 'Installation', url: '/docs/guides/installation' },
			],
		},
		{
			type: 'folder',
			name: 'SDK Reference',
			children: [
				{ type: 'page', name: 'Overview', url: '/docs/sdk' },
				{ type: 'page', name: 'HareEdgeAgent', url: '/docs/sdk/edge-agent' },
				{ type: 'page', name: 'HareAgent', url: '/docs/sdk/hare-agent' },
				{ type: 'page', name: 'McpAgent', url: '/docs/sdk/mcp-agent' },
				{ type: 'page', name: 'Memory', url: '/docs/sdk/memory' },
				{ type: 'page', name: 'Providers', url: '/docs/sdk/providers' },
				{ type: 'page', name: 'Router', url: '/docs/sdk/router' },
				{ type: 'page', name: 'Tools', url: '/docs/sdk/tools' },
				{ type: 'page', name: 'Types', url: '/docs/sdk/types' },
			],
		},
		{
			type: 'folder',
			name: 'API Reference',
			children: [{ type: 'page', name: 'Overview', url: '/docs/api' }],
		},
	],
}

// Map URL paths to content file paths
function getContentPath(urlPath: string): string {
	const slug = urlPath.replace('/docs/', '').replace('/docs', '')
	if (!slug || slug === '/') return 'index'
	return slug
}

// Find page info from tree
function findPage(tree: TreeNode[], url: string): { name: string; url: string } | null {
	for (const node of tree) {
		if (node.type === 'page' && node.url === url) {
			return { name: node.name, url: node.url }
		}
		if (node.type === 'folder' && node.children) {
			const found = findPage(node.children, url)
			if (found) return found
		}
	}
	return null
}

export const Route = createFileRoute('/docs/$')({
	component: Page,
	// Client-only - no SSR to avoid Node.js path dependencies
	ssr: false,
})

function Page() {
	const params = Route.useParams()
	const slugPath = params._splat || ''
	const fullPath = `/docs${slugPath ? `/${slugPath}` : ''}`

	const [MDX, setMDX] = useState<ComponentType | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [pageData, setPageData] = useState<{
		title: string
		description?: string
		toc?: Array<{ title: string; url: string; depth: number }>
	} | null>(null)

	useEffect(() => {
		async function loadContent() {
			setLoading(true)
			setError(null)

			try {
				const browserCollections = (await import('fumadocs-mdx:collections/browser')).default
				const contentPath = getContentPath(fullPath)

				// Get the loader function for this content
				const loaderKey = Object.keys(browserCollections.docs.raw).find((key) => {
					const normalizedKey = key.replace(/\.(mdx|md)$/, '').replace(/^\.\//, '')
					return normalizedKey === contentPath || normalizedKey === `${contentPath}/index`
				})

				if (!loaderKey) {
					setError('Page not found')
					setLoading(false)
					return
				}

				const content = await browserCollections.docs.raw[loaderKey]()
				if (!content?.default) {
					setError('Failed to load content')
					setLoading(false)
					return
				}

				// Get page info from tree
				const pageInfo = findPage(pageTree.children, fullPath)

				setMDX(() => content.default)
				setPageData({
					title: content.frontmatter?.title || pageInfo?.name || 'Documentation',
					description: content.frontmatter?.description,
					toc: content.toc || [],
				})
			} catch (err) {
				console.error('Failed to load docs page:', err)
				setError('Failed to load page')
			} finally {
				setLoading(false)
			}
		}

		loadContent()
	}, [fullPath])

	if (loading) {
		return (
			<RootProvider>
				<DocsLayout {...getLayoutOptions()} tree={pageTree}>
					<DocsPage>
						<DocsBody>
							<div className="flex items-center justify-center py-12">
								<div className="animate-pulse text-muted-foreground">Loading...</div>
							</div>
						</DocsBody>
					</DocsPage>
				</DocsLayout>
			</RootProvider>
		)
	}

	if (error || !MDX || !pageData) {
		return (
			<RootProvider>
				<DocsLayout {...getLayoutOptions()} tree={pageTree}>
					<DocsPage>
						<DocsTitle>Not Found</DocsTitle>
						<DocsBody>
							<p>The requested documentation page could not be found.</p>
						</DocsBody>
					</DocsPage>
				</DocsLayout>
			</RootProvider>
		)
	}

	return (
		<RootProvider>
			<DocsLayout {...getLayoutOptions()} tree={pageTree}>
				<DocsPage toc={pageData.toc}>
					<DocsTitle>{pageData.title}</DocsTitle>
					{pageData.description && <DocsDescription>{pageData.description}</DocsDescription>}
					<DocsBody>
						<MDX
							components={{
								...defaultMdxComponents,
								...getMDXComponents(),
							}}
						/>
					</DocsBody>
				</DocsPage>
			</DocsLayout>
		</RootProvider>
	)
}
