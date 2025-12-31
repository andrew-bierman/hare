import browserCollections from 'fumadocs-mdx:collections/browser'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import type { ComponentType } from 'react'
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

		// Preload the MDX content on the client
		await clientLoader.preload(page.path)

		return {
			path: page.path,
			pageTree: await source.serializePageTree(source.pageTree),
		}
	},
})

interface DocsComponentProps {
	toc: { title: string; url: string; depth: number }[]
	frontmatter: { title: string; description?: string }
	default: ComponentType
}

const clientLoader = browserCollections.docs.createClientLoader({
	component({ toc, frontmatter, default: MDX }: DocsComponentProps) {
		return (
			<DocsPage toc={toc}>
				<DocsTitle>{frontmatter.title}</DocsTitle>
				<DocsDescription>{frontmatter.description}</DocsDescription>
				<DocsBody>
					<MDX
						components={{
							...defaultMdxComponents,
							...getMDXComponents(),
						}}
					/>
				</DocsBody>
			</DocsPage>
		)
	},
})

function Page() {
	const data = Route.useLoaderData()
	const { pageTree } = useFumadocsLoader(data)
	const Content = clientLoader.getComponent(data.path)

	return (
		<RootProvider>
			<DocsLayout {...getLayoutOptions()} tree={pageTree}>
				<Content />
			</DocsLayout>
		</RootProvider>
	)
}
