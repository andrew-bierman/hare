import {
	ArrowRight,
	Bot,
	Boxes,
	Cloud,
	Code,
	GitBranch,
	Globe,
	Layers,
	MessageSquare,
	Play,
	Shield,
	Sparkles,
	Terminal,
	Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'

export default function LandingPage() {
	const features = [
		{
			title: 'Visual Agent Builder',
			description:
				'Design complex agent workflows with our intuitive drag-and-drop interface. No code required to get started.',
			icon: Boxes,
		},
		{
			title: 'Instant Deployment',
			description:
				'Deploy to Cloudflare\'s global edge network in seconds. Your agents run close to your users, everywhere.',
			icon: Cloud,
		},
		{
			title: 'Built-in Tools',
			description:
				'Connect to databases, APIs, and storage out of the box. SQL, HTTP, KV, R2, and vector search ready to go.',
			icon: Layers,
		},
		{
			title: 'Developer SDK',
			description:
				'Full TypeScript SDK with type-safe APIs. Integrate agents into any application with a few lines of code.',
			icon: Code,
		},
		{
			title: 'Real-time Streaming',
			description:
				'Stream responses as they generate. Build responsive chat interfaces with built-in WebSocket support.',
			icon: MessageSquare,
		},
		{
			title: 'Enterprise Security',
			description:
				'SOC 2 compliant infrastructure with end-to-end encryption. Your data never leaves your control.',
			icon: Shield,
		},
	]

	const steps = [
		{
			step: '01',
			title: 'Define Your Agent',
			description: 'Configure your agent\'s personality, capabilities, and the tools it can access.',
			icon: Bot,
		},
		{
			step: '02',
			title: 'Add Tools & Integrations',
			description: 'Connect databases, APIs, and custom functions. Your agent becomes truly powerful.',
			icon: Terminal,
		},
		{
			step: '03',
			title: 'Test in Playground',
			description: 'Iterate quickly with our live playground. See exactly how your agent behaves.',
			icon: Play,
		},
		{
			step: '04',
			title: 'Deploy Globally',
			description: 'One click to deploy. Your agent runs on 300+ edge locations worldwide.',
			icon: Globe,
		},
	]

	return (
		<div className="flex min-h-screen flex-col">
			{/* Navigation */}
			<header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
				<div className="container flex h-16 items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
							<Sparkles className="h-4 w-4 text-primary-foreground" />
						</div>
						<span className="font-bold text-xl">Hare</span>
					</div>
					<nav className="hidden md:flex items-center gap-6">
						<Link
							href="#features"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Features
						</Link>
						<Link
							href="#how-it-works"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							How it Works
						</Link>
						<Link
							href="https://github.com"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							GitHub
						</Link>
						<Link
							href="/docs"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Docs
						</Link>
					</nav>
					<div className="flex items-center gap-3">
						<Link href="/sign-in">
							<Button variant="ghost" size="sm">
								Sign In
							</Button>
						</Link>
						<Link href="/sign-up">
							<Button size="sm">Get Started</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative overflow-hidden">
				{/* Background gradient */}
				<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
				<div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl" aria-hidden="true">
					<div
						className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary/20 to-primary/5 opacity-30"
						style={{
							clipPath:
								'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
						}}
					/>
				</div>

				<div className="container py-24 sm:py-32 lg:py-40">
					<div className="mx-auto max-w-4xl text-center">
						<Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5">
							<Sparkles className="h-3.5 w-3.5" />
							Now in Public Beta
						</Badge>
						<h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
							Build & Deploy
							<span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
								AI Agents at the Edge
							</span>
						</h1>
						<p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
							The fastest way to create, deploy, and scale AI agents. Built on Cloudflare Workers
							for instant global deployment. Open source and self-hostable.
						</p>
						<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link href="/sign-up">
								<Button size="lg" className="gap-2 px-8 h-12 text-base">
									Start Building Free
									<ArrowRight className="h-4 w-4" />
								</Button>
							</Link>
							<Link href="/dashboard">
								<Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base">
									<Play className="h-4 w-4" />
									View Live Demo
								</Button>
							</Link>
						</div>
						<div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<GitBranch className="h-4 w-4" />
								Open Source
							</div>
							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4" />
								300+ Edge Locations
							</div>
							<div className="flex items-center gap-2">
								<Zap className="h-4 w-4" />
								Sub-50ms Latency
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Code Preview / Visual */}
			<section className="container pb-16">
				<div className="mx-auto max-w-5xl">
					<div className="relative rounded-xl border bg-gradient-to-b from-muted/50 to-muted p-2">
						<div className="absolute -top-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
						<div className="rounded-lg border bg-background p-6 shadow-2xl">
							<div className="flex items-center gap-2 border-b pb-4">
								<div className="h-3 w-3 rounded-full bg-red-500" />
								<div className="h-3 w-3 rounded-full bg-yellow-500" />
								<div className="h-3 w-3 rounded-full bg-green-500" />
								<span className="ml-4 text-sm text-muted-foreground">agent.config.ts</span>
							</div>
							<pre className="mt-4 overflow-x-auto text-sm">
								<code className="text-muted-foreground">
									{`import { Agent } from '@hare/sdk'

const agent = new Agent({
  name: 'Customer Support',
  model: 'claude-3-sonnet',
  tools: ['database', 'email', 'calendar'],
  systemPrompt: \`You are a helpful customer support agent.
    You can access order history, send emails, and schedule callbacks.\`
})

// Deploy to edge with one command
await agent.deploy()

// That's it. Your agent is live globally.`}
								</code>
							</pre>
						</div>
					</div>
				</div>
			</section>

			{/* Features Grid */}
			<section id="features" className="container py-24">
				<div className="mx-auto max-w-2xl text-center">
					<Badge variant="outline" className="mb-4">
						Features
					</Badge>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Everything you need to build production agents
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						From prototype to production in minutes, not months. All the infrastructure handled for
						you.
					</p>
				</div>
				<div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => (
						<Card
							key={feature.title}
							className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
						>
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
									<feature.icon className="h-6 w-6" />
								</div>
								<CardTitle className="text-xl">{feature.title}</CardTitle>
								<CardDescription className="text-base">{feature.description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</section>

			{/* How it Works */}
			<section id="how-it-works" className="border-y bg-muted/30 py-24">
				<div className="container">
					<div className="mx-auto max-w-2xl text-center">
						<Badge variant="outline" className="mb-4">
							How it Works
						</Badge>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
							From idea to deployed agent in 4 steps
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Build your first agent in under 5 minutes. No infrastructure knowledge required.
						</p>
					</div>
					<div className="mx-auto mt-16 max-w-5xl">
						<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
							{steps.map((step, index) => (
								<div key={step.step} className="relative">
									{index < steps.length - 1 && (
										<div className="absolute left-1/2 top-12 hidden h-px w-full bg-border lg:block" />
									)}
									<div className="relative flex flex-col items-center text-center">
										<div className="flex h-24 w-24 items-center justify-center rounded-full border-2 bg-background">
											<step.icon className="h-10 w-10 text-primary" />
										</div>
										<span className="mt-4 text-sm font-medium text-primary">{step.step}</span>
										<h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
										<p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="container py-24">
				<div className="mx-auto max-w-5xl">
					<div className="grid gap-8 rounded-2xl border bg-gradient-to-br from-primary/5 via-transparent to-primary/5 p-8 md:grid-cols-4">
						<div className="text-center">
							<div className="text-4xl font-bold text-primary">300+</div>
							<div className="mt-1 text-sm text-muted-foreground">Edge Locations</div>
						</div>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary">&lt;50ms</div>
							<div className="mt-1 text-sm text-muted-foreground">Global Latency</div>
						</div>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary">99.99%</div>
							<div className="mt-1 text-sm text-muted-foreground">Uptime SLA</div>
						</div>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary">10K+</div>
							<div className="mt-1 text-sm text-muted-foreground">Agents Deployed</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="container pb-24">
				<div className="mx-auto max-w-4xl">
					<div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground shadow-2xl sm:px-16">
						<div
							className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"
							aria-hidden="true"
						/>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
							Ready to build your first agent?
						</h2>
						<p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
							Join developers who are building the future of AI-powered applications. Free to start,
							scales with you.
						</p>
						<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link href="/sign-up">
								<Button size="lg" variant="secondary" className="gap-2 px-8 h-12">
									Get Started Free
									<ArrowRight className="h-4 w-4" />
								</Button>
							</Link>
							<Link href="https://github.com">
								<Button
									size="lg"
									variant="outline"
									className="gap-2 px-8 h-12 border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
								>
									<GitBranch className="h-4 w-4" />
									Star on GitHub
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-12">
				<div className="container">
					<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
								<Sparkles className="h-4 w-4 text-primary-foreground" />
							</div>
							<span className="font-bold text-xl">Hare</span>
						</div>
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							<Link href="/docs" className="hover:text-foreground transition-colors">
								Documentation
							</Link>
							<Link href="https://github.com" className="hover:text-foreground transition-colors">
								GitHub
							</Link>
							<Link href="/privacy" className="hover:text-foreground transition-colors">
								Privacy
							</Link>
							<Link href="/terms" className="hover:text-foreground transition-colors">
								Terms
							</Link>
						</div>
						<div className="text-sm text-muted-foreground">
							Built on{' '}
							<Link
								href="https://cloudflare.com"
								className="text-foreground hover:underline"
								target="_blank"
							>
								Cloudflare
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
