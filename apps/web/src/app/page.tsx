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
			description: 'Design complex agent workflows with our intuitive drag-and-drop interface.',
			icon: Boxes,
		},
		{
			title: 'Instant Deployment',
			description: "Deploy to Cloudflare's global edge network in seconds.",
			icon: Cloud,
		},
		{
			title: 'Built-in Tools',
			description: 'SQL, HTTP, KV, R2, and vector search ready to go.',
			icon: Layers,
		},
		{
			title: 'Developer SDK',
			description: 'Full TypeScript SDK with type-safe APIs.',
			icon: Code,
		},
		{
			title: 'Real-time Streaming',
			description: 'Stream responses with built-in WebSocket support.',
			icon: MessageSquare,
		},
		{
			title: 'Enterprise Security',
			description: 'SOC 2 compliant with end-to-end encryption.',
			icon: Shield,
		},
	]

	const steps = [
		{ title: 'Define', description: 'Configure your agent', icon: Bot },
		{ title: 'Add Tools', description: 'Connect databases & APIs', icon: Terminal },
		{ title: 'Test', description: 'Iterate in playground', icon: Play },
		{ title: 'Deploy', description: '300+ edge locations', icon: Globe },
	]

	return (
		<div className="flex min-h-screen flex-col">
			{/* Navigation */}
			<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center justify-between px-4 sm:h-16">
					<Link href="/" className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
							<Sparkles className="h-4 w-4 text-primary-foreground" />
						</div>
						<span className="font-bold text-lg">Hare</span>
					</Link>

					<nav className="hidden md:flex items-center gap-6">
						<Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
							Features
						</Link>
						<Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
							How it Works
						</Link>
						<Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
							Docs
						</Link>
					</nav>

					<div className="flex items-center gap-2">
						<Link href="/sign-in" className="hidden sm:block">
							<Button variant="ghost" size="sm">Sign In</Button>
						</Link>
						<Link href="/sign-up">
							<Button size="sm">Get Started</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="px-4 py-12 sm:py-16 md:py-24 lg:py-32">
				<div className="container max-w-4xl mx-auto text-center">
					<Badge variant="secondary" className="mb-4">
						<Sparkles className="h-3 w-3 mr-1" />
						Public Beta
					</Badge>

					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
						Build & Deploy{' '}
						<span className="text-primary">AI Agents</span> at the Edge
					</h1>

					<p className="mt-4 text-base text-muted-foreground sm:text-lg md:text-xl max-w-2xl mx-auto">
						The fastest way to create, deploy, and scale AI agents. Open source and self-hostable.
					</p>

					{/* CTA - stack on mobile */}
					<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
						<Link href="/sign-up" className="w-full sm:w-auto">
							<Button size="lg" className="w-full sm:w-auto gap-2 h-12">
								Start Building Free
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
						<Link href="/dashboard" className="w-full sm:w-auto">
							<Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 h-12">
								<Play className="h-4 w-4" />
								Live Demo
							</Button>
						</Link>
					</div>

					{/* Stats */}
					<div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
						<div className="flex items-center gap-1.5">
							<GitBranch className="h-4 w-4" />
							<span>Open Source</span>
						</div>
						<div className="flex items-center gap-1.5">
							<Globe className="h-4 w-4" />
							<span>300+ Locations</span>
						</div>
						<div className="flex items-center gap-1.5">
							<Zap className="h-4 w-4" />
							<span>&lt;50ms Latency</span>
						</div>
					</div>
				</div>
			</section>

			{/* Code Preview */}
			<section className="px-4 pb-12 sm:pb-16 md:pb-24">
				<div className="container max-w-3xl mx-auto">
					<div className="rounded-lg border bg-card overflow-hidden">
						<div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/50">
							<div className="h-2.5 w-2.5 rounded-full bg-red-500" />
							<div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
							<div className="h-2.5 w-2.5 rounded-full bg-green-500" />
							<span className="ml-2 text-xs text-muted-foreground font-mono">agent.ts</span>
						</div>
						<pre className="p-4 overflow-x-auto text-xs sm:text-sm">
							<code className="text-muted-foreground">
{`import { Agent } from '@hare/sdk'

const agent = new Agent({
  name: 'Support Bot',
  model: 'claude-3-sonnet',
  tools: ['database', 'email'],
})

await agent.deploy()`}
							</code>
						</pre>
					</div>
				</div>
			</section>

			{/* Features - 1 col mobile, 2 col tablet, 3 col desktop */}
			<section id="features" className="px-4 py-12 sm:py-16 md:py-24 bg-muted/50">
				<div className="container max-w-6xl mx-auto">
					<div className="text-center mb-8 sm:mb-12">
						<Badge variant="outline" className="mb-3">Features</Badge>
						<h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
							Everything you need
						</h2>
						<p className="mt-2 text-muted-foreground">
							From prototype to production in minutes.
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<Card key={feature.title} className="h-full">
								<CardHeader className="pb-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
										<feature.icon className="h-5 w-5 text-primary" />
									</div>
									<CardTitle className="text-lg">{feature.title}</CardTitle>
								</CardHeader>
								<CardContent className="pt-0">
									<CardDescription>{feature.description}</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* How it Works - vertical on mobile, horizontal on desktop */}
			<section id="how-it-works" className="px-4 py-12 sm:py-16 md:py-24">
				<div className="container max-w-4xl mx-auto">
					<div className="text-center mb-8 sm:mb-12">
						<Badge variant="outline" className="mb-3">How it Works</Badge>
						<h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
							4 simple steps
						</h2>
						<p className="mt-2 text-muted-foreground">
							Build your first agent in under 5 minutes.
						</p>
					</div>

					<div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
						{steps.map((step, index) => (
							<div key={step.title} className="flex gap-4 md:flex-col md:text-center">
								<div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background md:mx-auto">
									<step.icon className="h-5 w-5 text-primary" />
								</div>
								<div>
									<span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
									<h3 className="font-semibold">{step.title}</h3>
									<p className="text-sm text-muted-foreground">{step.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Stats - 2x2 grid on mobile, 4 col on desktop */}
			<section className="px-4 py-12 sm:py-16 md:py-24 bg-muted/50">
				<div className="container max-w-3xl mx-auto">
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{[
							{ value: '300+', label: 'Edge Locations' },
							{ value: '<50ms', label: 'Global Latency' },
							{ value: '99.99%', label: 'Uptime SLA' },
							{ value: '10K+', label: 'Agents Deployed' },
						].map((stat) => (
							<div key={stat.label} className="text-center p-4 rounded-lg border bg-background">
								<div className="text-2xl font-bold sm:text-3xl text-primary">{stat.value}</div>
								<div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-4 py-12 sm:py-16 md:py-24">
				<div className="container max-w-3xl mx-auto">
					<div className="rounded-2xl bg-primary p-6 sm:p-8 md:p-12 text-center text-primary-foreground">
						<h2 className="text-xl font-bold sm:text-2xl md:text-3xl">
							Ready to build your first agent?
						</h2>
						<p className="mt-3 text-primary-foreground/80 text-sm sm:text-base">
							Free to start, scales with you.
						</p>
						<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link href="/sign-up" className="w-full sm:w-auto">
								<Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2 h-12">
									Get Started Free
									<ArrowRight className="h-4 w-4" />
								</Button>
							</Link>
							<Link href="https://github.com" className="w-full sm:w-auto">
								<Button
									size="lg"
									variant="outline"
									className="w-full sm:w-auto gap-2 h-12 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
								>
									<GitBranch className="h-4 w-4" />
									GitHub
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8 px-4">
				<div className="container">
					<div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
						<div className="flex items-center gap-2">
							<div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
								<Sparkles className="h-3 w-3 text-primary-foreground" />
							</div>
							<span className="font-semibold">Hare</span>
						</div>
						<nav className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
							<Link href="/docs" className="hover:text-foreground">Docs</Link>
							<Link href="https://github.com" className="hover:text-foreground">GitHub</Link>
							<Link href="/privacy" className="hover:text-foreground">Privacy</Link>
							<Link href="/terms" className="hover:text-foreground">Terms</Link>
						</nav>
					</div>
				</div>
			</footer>
		</div>
	)
}
