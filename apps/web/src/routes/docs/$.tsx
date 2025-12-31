import { createFileRoute, notFound } from '@tanstack/react-router'
import type { Root } from 'fumadocs-core/page-tree'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { Suspense, use, useState, useEffect, type ComponentType } from 'react'
import { getLayoutOptions } from '../../lib/docs/layout.shared'
import { getMDXComponents } from '../../lib/docs/mdx-components'
import { source, loadPage, serializePageTree, pageTree, getPageFrontmatter } from '../../lib/docs/custom-loader'
import '../../styles/docs.css'

export const Route = createFileRoute('/docs/$')({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split('/') ?? []
		const page = source.getPage(slugs)
		if (!page) throw notFound()

		// Get frontmatter from the pre-loaded data (not the async loaded content)
		const frontmatter = getPageFrontmatter(page.path)
		if (!frontmatter) throw notFound()

		return {
			path: page.path,
			pageTree: serializePageTree(pageTree),
			frontmatter,
		}
	},
})

// Hook to load MDX content on client
function useDocContent(path: string) {
	const [content, setContent] = useState<{
		MDX: ComponentType
		toc: { title: string; url: string; depth: number }[]
	} | null>(null)

	useEffect(() => {
		loadPage(path).then((mod) => {
			if (mod) {
				setContent({ MDX: mod.default, toc: mod.toc })
			}
		})
	}, [path])

	return content
}

function MDXContent({ path }: { path: string }) {
	const content = useDocContent(path)

	if (!content) {
		return <div>Loading...</div>
	}

	const { MDX } = content
	return (
		<MDX
			components={{
				...defaultMdxComponents,
				...getMDXComponents(),
			}}
		/>
	)
}

function Page() {
	const { path, pageTree: serializedTree, frontmatter } = Route.useLoaderData()
	const content = useDocContent(path)

	// Cast back to Root type (it's already in the right shape)
	const tree = serializedTree as Root

	return (
		<RootProvider>
			<DocsLayout {...getLayoutOptions()} tree={tree}>
				<DocsPage toc={content?.toc ?? []}>
					<DocsTitle>{frontmatter.title}</DocsTitle>
					<DocsDescription>{frontmatter.description}</DocsDescription>
					<DocsBody>
						<MDXContent path={path} />
					</DocsBody>
				</DocsPage>
			</DocsLayout>
		</RootProvider>
	)
}
