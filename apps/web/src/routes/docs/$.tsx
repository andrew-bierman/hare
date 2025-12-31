import { createFileRoute, notFound } from '@tanstack/react-router'
import type { Root } from 'fumadocs-core/page-tree'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { getLayoutOptions } from '../../lib/docs/layout.shared'
import { getMDXComponents } from '../../lib/docs/mdx-components'
import { source } from '../../lib/docs/source'
import '../../styles/docs.css'

export const Route = createFileRoute('/docs/$')({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split('/') ?? []
		const page = source.getPage(slugs)
		if (!page) throw notFound()

		const MDX = page.data.body

		return {
			title: page.data.title,
			description: page.data.description,
			toc: page.data.toc,
			pageTree: await source.serializePageTree(source.pageTree),
			MDX,
		}
	},
})

function Page() {
	const loaderData = Route.useLoaderData()
	const { title, description, toc, pageTree, MDX } = loaderData as {
		title: string | undefined
		description: string | undefined
		toc: unknown
		pageTree: Root
		MDX: React.ComponentType
	}

	return (
		<RootProvider>
			<DocsLayout {...getLayoutOptions()} tree={pageTree}>
				<DocsPage toc={toc}>
					<DocsTitle>{title}</DocsTitle>
					<DocsDescription>{description}</DocsDescription>
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
