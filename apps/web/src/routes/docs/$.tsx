import { MDXProvider } from '@mdx-js/react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import { getDocCategories, getDocPage } from '../../lib/docs/simple-docs'
import 'highlight.js/styles/github-dark.css'

// Custom MDX components
const mdxComponents = {
	h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0" {...props} />
	),
	h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h2 className="text-2xl font-semibold mt-8 mb-3 pb-2 border-b" {...props} />
	),
	h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h3 className="text-xl font-semibold mt-6 mb-2" {...props} />
	),
	p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
		<p className="my-4 leading-7" {...props} />
	),
	ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
		<ul className="my-4 ml-6 list-disc space-y-2" {...props} />
	),
	ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
		<ol className="my-4 ml-6 list-decimal space-y-2" {...props} />
	),
	li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-7" {...props} />,
	a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a className="text-primary underline hover:no-underline" {...props} />
	),
	code: (props: React.HTMLAttributes<HTMLElement>) => {
		const isInline = !props.className?.includes('hljs')
		if (isInline) {
			return <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" {...props} />
		}
		return <code {...props} />
	},
	pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
		<pre
			className="my-4 p-4 rounded-lg bg-zinc-900 text-zinc-100 overflow-x-auto text-sm"
			{...props}
		/>
	),
	blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
		<blockquote className="my-4 pl-4 border-l-4 border-muted-foreground/30 italic" {...props} />
	),
	table: (props: React.HTMLAttributes<HTMLTableElement>) => (
		<div className="my-4 overflow-x-auto">
			<table className="w-full border-collapse" {...props} />
		</div>
	),
	th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
		<th className="border px-4 py-2 bg-muted text-left font-semibold" {...props} />
	),
	td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
		<td className="border px-4 py-2" {...props} />
	),
}

export const Route = createFileRoute('/docs/$')({
	component: DocsPage,
	ssr: false, // Disable SSR because MDX components aren't serializable
	loader: ({ params }) => {
		const slug = params._splat || ''
		const page = getDocPage(slug)
		if (!page) throw notFound()
		// Return serializable data only - Component is accessed directly in the component
		return {
			slug: page.slug,
			title: page.title,
			description: page.description,
			category: page.category,
			categories: getDocCategories().map((c) => ({
				name: c.name,
				slug: c.slug,
				pages: c.pages.map((p) => ({
					slug: p.slug,
					title: p.title,
					description: p.description,
					category: p.category,
				})),
			})),
		}
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.title} | Hare Docs` },
			{ name: 'description', content: loaderData?.description || '' },
		],
	}),
})

// Serializable page data (without Component)
interface SidebarPage {
	slug: string
	title: string
	description: string | undefined
	category: string | undefined
}

interface SidebarCategory {
	name: string
	slug: string
	pages: SidebarPage[]
}

function Sidebar({
	categories,
	currentSlug,
}: {
	categories: SidebarCategory[]
	currentSlug: string
}) {
	return (
		<aside className="w-64 shrink-0 border-r h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-4">
			<nav className="space-y-6">
				{categories.map((category) => (
					<div key={category.slug}>
						<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
							{category.name}
						</h3>
						<ul className="space-y-1">
							{category.pages.map((page) => {
								const isActive =
									page.slug === currentSlug || (currentSlug === '' && page.slug === 'index')
								return (
									<li key={page.slug}>
										<Link
											to="/docs/$"
											params={{ _splat: page.slug === 'index' ? '' : page.slug }}
											className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
												isActive
													? 'bg-primary/10 text-primary font-medium'
													: 'text-muted-foreground hover:text-foreground hover:bg-muted'
											}`}
										>
											{page.title}
										</Link>
									</li>
								)
							})}
						</ul>
					</div>
				))}
			</nav>
		</aside>
	)
}

function DocsPage() {
	const loaderData = Route.useLoaderData()
	const params = Route.useParams()
	const currentSlug = params._splat || ''

	// Get the actual page with Component (not from loader since Components aren't serializable)
	const page = getDocPage(loaderData.slug)
	if (!page) return null

	const Content = page.Component as ComponentType
	const categories = loaderData.categories

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="h-16 border-b sticky top-0 bg-background/95 backdrop-blur z-50">
				<div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
					<Link to="/" className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
							<span className="text-white font-bold">H</span>
						</div>
						<span className="font-semibold">Hare Docs</span>
					</Link>
					<nav className="flex items-center gap-4">
						<Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
							Dashboard
						</Link>
						<a
							href="https://github.com/andrew-bierman/hare"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							GitHub
						</a>
					</nav>
				</div>
			</header>

			{/* Main content */}
			<div className="max-w-7xl mx-auto flex">
				<Sidebar categories={categories} currentSlug={currentSlug} />

				<main className="flex-1 min-w-0 px-8 py-8">
					<article className="max-w-3xl">
						{/* Breadcrumb */}
						{page.category && (
							<div className="text-sm text-muted-foreground mb-4">
								<Link to="/docs" className="hover:text-foreground">
									Docs
								</Link>
								<span className="mx-2">/</span>
								<span className="capitalize">{page.category}</span>
							</div>
						)}

						{/* Title */}
						<h1 className="text-4xl font-bold mb-2">{page.title}</h1>
						{page.description && (
							<p className="text-xl text-muted-foreground mb-8">{page.description}</p>
						)}

						{/* Content */}
						<div className="prose prose-zinc dark:prose-invert max-w-none">
							<MDXProvider components={mdxComponents}>
								<Content />
							</MDXProvider>
						</div>
					</article>
				</main>
			</div>
		</div>
	)
}
