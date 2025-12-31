import { createFileRoute, notFound } from '@tanstack/react-router'
import type { Root } from 'fumadocs-core/page-tree'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { source } from '../../lib/docs/source'
import { getLayoutOptions } from '../../lib/docs/layout.shared'
import { getMDXComponents } from '../../lib/docs/mdx-components'
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
			pageTree: source.pageTree,
			MDX,
		}
	},
})

function Page() {
	const { title, description, toc, pageTree, MDX } = Route.useLoaderData()

	return (
		<RootProvider>
			<DocsLayout {...getLayoutOptions()} tree={pageTree as Root}>
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
