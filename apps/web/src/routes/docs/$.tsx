import { createFileRoute, notFound } from '@tanstack/react-router'
import type { Root } from 'fumadocs-core/page-tree'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsPage } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { getLayoutOptions } from '../../lib/docs/layout.shared'
import { getMDXComponents } from '../../lib/docs/mdx-components'
import '../../styles/docs.css'

// Type for the page data returned from loader
interface DocsPageData {
	data: {
		title: string
		description?: string
		body: React.ComponentType<{ components?: Record<string, React.ComponentType> }>
		toc: unknown
	}
}

export const Route = createFileRoute('/docs/$')({
	component: DocsPageComponent,
	loader: async ({ params }) => {
		// Dynamic import - only loads on server to avoid bundling Node.js path module for client
		const { source } = await import('../../lib/docs/source')

		// _splat is available for catch-all routes
		const splat = (params as { _splat?: string })._splat
		const slugs = splat?.split('/').filter(Boolean) ?? []
		const page = source.getPage(slugs)

		if (!page) {
			throw notFound()
		}

		return { page, slugs, pageTree: source.pageTree }
	},
	head: ({ loaderData }) => ({
		title: loaderData?.page?.data.title
			? `${loaderData.page.data.title} - Hare Docs`
			: 'Documentation - Hare',
		meta: loaderData?.page?.data.description
			? [{ name: 'description', content: loaderData.page.data.description }]
			: [],
	}),
})

function DocsPageComponent() {
	// Page is guaranteed to exist since loader throws notFound() for missing pages
	const { page, pageTree } = Route.useLoaderData() as {
		page: DocsPageData
		pageTree: Root
	}
	const MDX = page.data.body

	// Combine default fumadocs components with our custom ones (AutoTypeTable, etc.)
	const components = {
		...defaultMdxComponents,
		...getMDXComponents(),
	}

	const toc = page.data.toc

	return (
		<RootProvider>
			<DocsLayout tree={pageTree} {...getLayoutOptions()}>
				<DocsPage toc={toc}>
					<DocsBody>
						<h1>{page.data.title}</h1>
						<MDX components={components} />
					</DocsBody>
				</DocsPage>
			</DocsLayout>
		</RootProvider>
	)
}
