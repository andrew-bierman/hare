import { PublicPageFooter, PublicPageHeader } from '@hare/app'
import { config } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	ArrowRight,
	Book,
	Bot,
	Code,
	ExternalLink,
	GitBranch,
	Rocket,
	Terminal,
	Wrench,
} from 'lucide-react'

// Local references for cleaner code
const APP_CONFIG = config.app

export const Route = createFileRoute('/docs/')({
	component: DocsPage,
	head: () => ({
		title: 'Documentation - Hare',
		meta: [{ name: 'description', content: 'Learn how to build and deploy AI agents with Hare' }],
	}),
})

const DOCS_SECTIONS = [
	{
		title: 'Getting Started',
		description: 'Learn the basics of creating your first AI agent',
		icon: Rocket,
		href: '/docs/guides/getting-started',
		links: [
			{ label: 'Quick Start Guide', href: '/docs/guides/getting-started' },
			{ label: 'Installation', href: '/docs/guides/installation' },
			{ label: 'HareEdgeAgent', href: '/docs/sdk/edge-agent' },
		],
	},
	{
		title: 'SDK Reference',
		description: 'Complete hareai SDK documentation',
		icon: Code,
		href: '/docs/sdk',
		links: [
			{ label: 'HareAgent', href: '/docs/sdk/hare-agent' },
			{ label: 'Memory Store', href: '/docs/sdk/memory' },
			{ label: 'Workers AI Provider', href: '/docs/sdk/providers' },
		],
	},
	{
		title: 'Tools Reference',
		description: 'Explore the 59+ built-in tools',
		icon: Wrench,
		href: '/docs/sdk/tools',
		links: [
			{ label: 'Storage Tools', href: '/docs/sdk/tools#storage-tools' },
			{ label: 'HTTP Tools', href: '/docs/sdk/tools#http-tools' },
			{ label: 'AI Tools', href: '/docs/sdk/tools#ai-tools' },
		],
	},
	{
		title: 'API Reference',
		description: 'REST API & MCP documentation',
		icon: Book,
		href: '/api/docs',
		links: [
			{ label: 'REST API', href: '/api/docs' },
			{ label: 'MCP Agent', href: '/docs/sdk/mcp-agent' },
			{ label: 'Integrations', href: '/docs/sdk/tools#integration-tools' },
		],
	},
]

const QUICK_START_STEPS = [
	{
		step: 1,
		title: 'Install the SDK',
		description: 'Add hareai to your Cloudflare Workers project.',
		code: `npm install hareai ai zod agents`,
	},
	{
		step: 2,
		title: 'Create Your Agent',
		description: 'Use HareEdgeAgent for a simple, universal agent.',
		code: `import { HareEdgeAgent } from 'hareai'

const agent = new HareEdgeAgent({
  name: 'My Agent',
  instructions: 'You are a helpful assistant.',
  model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  ai: env.AI,
})`,
	},
	{
		step: 3,
		title: 'Stream Responses',
		description: 'Get streaming responses from your agent.',
		code: `const response = await agent.stream([
  { role: 'user', content: 'Hello!' }
])

for await (const chunk of response.textStream) {
  console.log(chunk)
}`,
	},
	{
		step: 4,
		title: 'Deploy',
		description: "Your agent runs on Cloudflare's edge network.",
		code: `wrangler deploy`,
	},
]

function DocsPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<PublicPageHeader Link={Link} />

			{/* Hero */}
			<section className="px-4 py-12 sm:py-16 border-b bg-muted/30">
				<div className="container max-w-4xl mx-auto text-center">
					<Badge
						variant="secondary"
						className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
					>
						<Book className="h-3 w-3 mr-1" />
						Documentation
					</Badge>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
						Build AI Agents with{' '}
						<span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
							Hare
						</span>
					</h1>
					<p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
						Learn how to create, deploy, and manage AI agents on Cloudflare's edge network.
					</p>
				</div>
			</section>

			{/* Documentation Sections */}
			<section className="px-4 py-12 sm:py-16">
				<div className="container max-w-6xl mx-auto">
					<div className="grid gap-6 sm:grid-cols-2">
						{DOCS_SECTIONS.map((section) => (
							<Card key={section.title} className="h-full">
								<CardHeader>
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
										<section.icon className="h-5 w-5 text-primary" />
									</div>
									<CardTitle>{section.title}</CardTitle>
									<CardDescription>{section.description}</CardDescription>
								</CardHeader>
								<CardContent>
									<ul className="space-y-2">
										{section.links.map((link) => (
											<li key={link.label}>
												<Link
													to={link.href}
													className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
												>
													<ArrowRight className="h-3 w-3" />
													{link.label}
												</Link>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Quick Start */}
			<section id="quick-start" className="px-4 py-12 sm:py-16 bg-muted/50">
				<div className="container max-w-4xl mx-auto">
					<div className="text-center mb-8">
						<Badge variant="outline" className="mb-3">
							<Terminal className="h-3 w-3 mr-1" />
							Quick Start
						</Badge>
						<h2 className="text-2xl font-bold sm:text-3xl">Get started in minutes</h2>
					</div>

					<div className="space-y-6">
						{QUICK_START_STEPS.map((step) => (
							<div key={step.step} className="flex gap-4">
								<div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
									{step.step}
								</div>
								<div className="flex-1">
									<h3 className="font-semibold">{step.title}</h3>
									<p className="text-sm text-muted-foreground mt-1">{step.description}</p>
									{step.code && (
										<pre className="mt-3 p-4 rounded-lg bg-card border text-xs overflow-x-auto">
											<code>{step.code}</code>
										</pre>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Resources */}
			<section className="px-4 py-12 sm:py-16">
				<div className="container max-w-4xl mx-auto">
					<div className="text-center mb-8">
						<h2 className="text-2xl font-bold">Additional Resources</h2>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<a
							href={APP_CONFIG.repository}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary transition-colors"
						>
							<GitBranch className="h-5 w-5 text-muted-foreground" />
							<div>
								<div className="font-medium">GitHub</div>
								<div className="text-sm text-muted-foreground">View source code</div>
							</div>
							<ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
						</a>

						<Link
							to="/dashboard"
							className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary transition-colors"
						>
							<Bot className="h-5 w-5 text-muted-foreground" />
							<div>
								<div className="font-medium">Dashboard</div>
								<div className="text-sm text-muted-foreground">Manage agents</div>
							</div>
							<ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
						</Link>

						<a
							href="/api/docs"
							className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary transition-colors"
						>
							<Code className="h-5 w-5 text-muted-foreground" />
							<div>
								<div className="font-medium">API Docs</div>
								<div className="text-sm text-muted-foreground">OpenAPI reference</div>
							</div>
							<ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
						</a>
					</div>
				</div>
			</section>

			<PublicPageFooter Link={Link} />
		</div>
	)
}
