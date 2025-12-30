import { createFileRoute, notFound } from '@tanstack/react-router'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { DocsBody, DocsPage } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { source } from '../../lib/docs/source'
import { getLayoutOptions } from '../../lib/docs/layout.shared'
import { getMDXComponents } from '../../lib/docs/mdx-components'
import '../../styles/docs.css'

export const Route = createFileRoute('/docs/$')({
	component: DocsPageComponent,
	loader: async ({ params }) => {
		// @ts-expect-error - _splat is available for catch-all routes
		const splat = params._splat as string | undefined
		const slugs = splat?.split('/').filter(Boolean) ?? []
		const page = source.getPage(slugs)

		if (!page) {
			throw notFound()
		}

		return { page, slugs }
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
	// @ts-expect-error - loader data type inference
	const { page } = Route.useLoaderData()
	const MDX = page.data.body

	// Combine default fumadocs components with our custom ones (AutoTypeTable, etc.)
	const components = {
		...defaultMdxComponents,
		...getMDXComponents(),
	}

	return (
		<RootProvider>
			<DocsLayout tree={source.pageTree} {...getLayoutOptions()}>
				<DocsPage toc={page.data.toc}>
					<DocsBody>
						<h1>{page.data.title}</h1>
						<MDX components={components} />
					</DocsBody>
				</DocsPage>
			</DocsLayout>
		</RootProvider>
	)
}
