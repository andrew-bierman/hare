import { APP_CONFIG } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	ArrowRight,
	Book,
	Bot,
	Code,
	ExternalLink,
	GitBranch,
	Rabbit,
	Rocket,
	Terminal,
	Wrench,
} from 'lucide-react'

export const Route = createFileRoute('/docs')({
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
		links: [
			{ label: 'Quick Start Guide', href: '#quick-start' },
			{ label: 'Installation', href: '#installation' },
			{ label: 'Your First Agent', href: '#first-agent' },
		],
	},
	{
		title: 'Core Concepts',
		description: 'Understand how Hare agents work',
		icon: Book,
		links: [
			{ label: 'Agent Architecture', href: '#architecture' },
			{ label: 'Tools & Capabilities', href: '#tools' },
			{ label: 'Conversations', href: '#conversations' },
		],
	},
	{
		title: 'Tools Reference',
		description: 'Explore the 40+ built-in tools',
		icon: Wrench,
		links: [
			{ label: 'Storage Tools', href: '#storage' },
			{ label: 'HTTP Tools', href: '#http' },
			{ label: 'AI Tools', href: '#ai' },
		],
	},
	{
		title: 'API Reference',
		description: 'Complete API documentation',
		icon: Code,
		links: [
			{ label: 'REST API', href: '#rest-api' },
			{ label: 'MCP Protocol', href: '#mcp' },
			{ label: 'Webhooks', href: '#webhooks' },
		],
	},
]

const QUICK_START_STEPS = [
	{
		step: 1,
		title: 'Create an Account',
		description: 'Sign up for a free Hare account to get started.',
		code: null,
	},
	{
		step: 2,
		title: 'Create Your Agent',
		description: 'Use the visual builder or API to define your agent.',
		code: `const agent = {
  name: "My Assistant",
  model: "llama-3.3-70b",
  systemPrompt: "You are a helpful assistant."
}`,
	},
	{
		step: 3,
		title: 'Add Tools',
		description: 'Enable tools to give your agent capabilities.',
		code: `tools: ["web_search", "calculator", "code_interpreter"]`,
	},
	{
		step: 4,
		title: 'Deploy',
		description: 'Your agent is instantly deployed to the edge.',
		code: `// Your agent is live at:
https://hare.dev/api/agents/{agentId}/chat`,
	},
]

function DocsPage() {
	return (
		<div className="flex min-h-screen flex-col">
			{/* Header */}
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
					<Link to="/" className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
							<Rabbit className="h-5 w-5 text-white" />
						</div>
						<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							{APP_CONFIG.name}
						</span>
					</Link>

					<div className="flex items-center gap-2">
						<Link to="/sign-in">
							<Button variant="ghost" size="sm">
								Sign In
							</Button>
						</Link>
						<Link to="/sign-up">
							<Button size="sm">Get Started</Button>
						</Link>
					</div>
				</div>
			</header>

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
												<a
													href={link.href}
													className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
												>
													<ArrowRight className="h-3 w-3" />
													{link.label}
												</a>
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

			{/* Footer */}
			<footer className="border-t py-8 px-4 mt-auto">
				<div className="container max-w-4xl mx-auto">
					<div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
						<div className="flex items-center gap-2">
							<div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-orange-500 to-amber-500">
								<Rabbit className="h-3.5 w-3.5 text-white" />
							</div>
							<span className="font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
								{APP_CONFIG.name}
							</span>
						</div>
						<nav className="flex gap-4 text-sm text-muted-foreground">
							<Link to="/" className="hover:text-primary">
								Home
							</Link>
							<Link to="/privacy" className="hover:text-primary">
								Privacy
							</Link>
							<Link to="/terms" className="hover:text-primary">
								Terms
							</Link>
						</nav>
					</div>
				</div>
			</footer>
		</div>
	)
}
