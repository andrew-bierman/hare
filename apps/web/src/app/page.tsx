import {
	ArrowRight,
	Bot,
	Boxes,
	Check,
	ChevronRight,
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
			gradient: 'from-violet-500 to-purple-600',
		},
		{
			title: 'Instant Deployment',
			description:
				"Deploy to Cloudflare's global edge network in seconds. Your agents run close to your users, everywhere.",
			icon: Cloud,
			gradient: 'from-blue-500 to-cyan-500',
		},
		{
			title: 'Built-in Tools',
			description:
				'Connect to databases, APIs, and storage out of the box. SQL, HTTP, KV, R2, and vector search ready to go.',
			icon: Layers,
			gradient: 'from-emerald-500 to-teal-500',
		},
		{
			title: 'Developer SDK',
			description:
				'Full TypeScript SDK with type-safe APIs. Integrate agents into any application with a few lines of code.',
			icon: Code,
			gradient: 'from-orange-500 to-amber-500',
		},
		{
			title: 'Real-time Streaming',
			description:
				'Stream responses as they generate. Build responsive chat interfaces with built-in WebSocket support.',
			icon: MessageSquare,
			gradient: 'from-pink-500 to-rose-500',
		},
		{
			title: 'Enterprise Security',
			description:
				'SOC 2 compliant infrastructure with end-to-end encryption. Your data never leaves your control.',
			icon: Shield,
			gradient: 'from-indigo-500 to-violet-500',
		},
	]

	const steps = [
		{
			step: '01',
			title: 'Define Your Agent',
			description: "Configure your agent's personality, capabilities, and the tools it can access.",
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

	const testimonials = [
		{
			quote: "Hare reduced our agent deployment time from days to minutes. It's a game changer.",
			author: 'Sarah Chen',
			role: 'CTO at TechStart',
		},
		{
			quote: 'The edge deployment means our customers get instant responses, no matter where they are.',
			author: 'Marcus Johnson',
			role: 'Lead Engineer at ScaleAI',
		},
		{
			quote: "Finally, an AI platform that doesn't require a PhD to use. Our whole team can build agents now.",
			author: 'Emily Rodriguez',
			role: 'Product Manager at InnovateCo',
		},
	]

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Navigation */}
			<header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
				<div className="container flex h-16 items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
							<Sparkles className="h-5 w-5 text-primary-foreground" />
						</div>
						<span className="font-bold text-xl tracking-tight">Hare</span>
					</div>
					<nav className="hidden md:flex items-center gap-8">
						<Link
							href="#features"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Features
						</Link>
						<Link
							href="#how-it-works"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							How it Works
						</Link>
						<Link
							href="https://github.com"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							GitHub
						</Link>
						<Link
							href="/docs"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
							<Button size="sm" className="shadow-lg shadow-primary/25">
								Get Started
								<ChevronRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative overflow-hidden">
				{/* Animated background */}
				<div className="absolute inset-0 -z-10">
					<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
					<div className="absolute left-1/2 top-0 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl" />
					<div className="absolute right-0 top-1/4 w-96 h-96 bg-gradient-to-l from-violet-500/10 to-transparent blur-3xl rounded-full" />
					<div className="absolute left-0 bottom-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-transparent blur-3xl rounded-full" />
				</div>

				<div className="container py-24 sm:py-32 lg:py-40">
					<div className="mx-auto max-w-4xl text-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 mb-8">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
							</span>
							<span className="text-sm font-medium text-primary">Now in Public Beta</span>
						</div>

						<h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
							Build & Deploy
							<span className="block mt-2 bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
								AI Agents at the Edge
							</span>
						</h1>

						<p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
							The fastest way to create, deploy, and scale AI agents. Built on Cloudflare Workers
							for instant global deployment. Open source and self-hostable.
						</p>

						<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link href="/sign-up">
								<Button size="lg" className="gap-2 px-8 h-14 text-base shadow-xl shadow-primary/30">
									Start Building Free
									<ArrowRight className="h-5 w-5" />
								</Button>
							</Link>
							<Link href="/dashboard">
								<Button size="lg" variant="outline" className="gap-2 px-8 h-14 text-base">
									<Play className="h-5 w-5" />
									View Live Demo
								</Button>
							</Link>
						</div>

						<div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
							<div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
								<GitBranch className="h-4 w-4 text-primary" />
								Open Source
							</div>
							<div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
								<Globe className="h-4 w-4 text-primary" />
								300+ Edge Locations
							</div>
							<div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
								<Zap className="h-4 w-4 text-primary" />
								Sub-50ms Latency
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Code Preview */}
			<section className="container pb-24">
				<div className="mx-auto max-w-4xl">
					<div className="relative">
						{/* Glow effect */}
						<div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-violet-500/20 to-purple-500/20 blur-2xl opacity-50 rounded-3xl" />

						<div className="relative rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">
							{/* Window controls */}
							<div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
								<div className="flex items-center gap-2">
									<div className="h-3 w-3 rounded-full bg-red-500/80" />
									<div className="h-3 w-3 rounded-full bg-yellow-500/80" />
									<div className="h-3 w-3 rounded-full bg-green-500/80" />
								</div>
								<span className="ml-4 text-sm text-muted-foreground font-mono">agent.config.ts</span>
							</div>

							<pre className="p-6 overflow-x-auto text-sm leading-relaxed">
								<code>
									<span className="text-violet-500">import</span>
									<span className="text-foreground"> {'{ '}</span>
									<span className="text-blue-500">Agent</span>
									<span className="text-foreground">{' }'} </span>
									<span className="text-violet-500">from</span>
									<span className="text-emerald-500"> '@hare/sdk'</span>
									{'\n\n'}
									<span className="text-violet-500">const</span>
									<span className="text-foreground"> agent </span>
									<span className="text-violet-500">=</span>
									<span className="text-violet-500"> new</span>
									<span className="text-blue-500"> Agent</span>
									<span className="text-foreground">{'({'}</span>
									{'\n'}
									<span className="text-foreground">{'  '}</span>
									<span className="text-blue-400">name</span>
									<span className="text-foreground">: </span>
									<span className="text-emerald-500">'Customer Support'</span>
									<span className="text-foreground">,</span>
									{'\n'}
									<span className="text-foreground">{'  '}</span>
									<span className="text-blue-400">model</span>
									<span className="text-foreground">: </span>
									<span className="text-emerald-500">'claude-3-sonnet'</span>
									<span className="text-foreground">,</span>
									{'\n'}
									<span className="text-foreground">{'  '}</span>
									<span className="text-blue-400">tools</span>
									<span className="text-foreground">: [</span>
									<span className="text-emerald-500">'database'</span>
									<span className="text-foreground">, </span>
									<span className="text-emerald-500">'email'</span>
									<span className="text-foreground">, </span>
									<span className="text-emerald-500">'calendar'</span>
									<span className="text-foreground">],</span>
									{'\n'}
									<span className="text-foreground">{'  '}</span>
									<span className="text-blue-400">systemPrompt</span>
									<span className="text-foreground">: </span>
									<span className="text-emerald-500">`You are a helpful support agent...`</span>
									{'\n'}
									<span className="text-foreground">{'})'}</span>
									{'\n\n'}
									<span className="text-muted-foreground">{'// Deploy to edge with one command'}</span>
									{'\n'}
									<span className="text-violet-500">await</span>
									<span className="text-foreground"> agent.</span>
									<span className="text-blue-400">deploy</span>
									<span className="text-foreground">()</span>
									{'\n\n'}
									<span className="text-muted-foreground">{'// That\'s it. Your agent is live globally.'}</span>
								</code>
							</pre>
						</div>
					</div>
				</div>
			</section>

			{/* Features Grid */}
			<section id="features" className="py-24 bg-muted/30">
				<div className="container">
					<div className="mx-auto max-w-2xl text-center mb-16">
						<Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
							Features
						</Badge>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							Everything you need to build
							<span className="block text-primary">production-ready agents</span>
						</h2>
						<p className="mt-6 text-lg text-muted-foreground">
							From prototype to production in minutes, not months. All the infrastructure handled for
							you.
						</p>
					</div>

					<div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<Card
								key={feature.title}
								className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
							>
								<CardHeader className="pb-4">
									<div
										className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
									>
										<feature.icon className="h-7 w-7 text-white" />
									</div>
									<CardTitle className="text-xl">{feature.title}</CardTitle>
								</CardHeader>
								<CardContent className="pt-0">
									<CardDescription className="text-base leading-relaxed">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* How it Works */}
			<section id="how-it-works" className="py-24">
				<div className="container">
					<div className="mx-auto max-w-2xl text-center mb-16">
						<Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
							How it Works
						</Badge>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							From idea to deployed agent
							<span className="block text-primary">in 4 simple steps</span>
						</h2>
						<p className="mt-6 text-lg text-muted-foreground">
							Build your first agent in under 5 minutes. No infrastructure knowledge required.
						</p>
					</div>

					<div className="mx-auto max-w-5xl">
						<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
							{steps.map((step, index) => (
								<div key={step.step} className="relative group">
									{/* Connector line */}
									{index < steps.length - 1 && (
										<div className="absolute left-1/2 top-16 hidden h-px w-full bg-gradient-to-r from-border via-primary/30 to-border lg:block" />
									)}

									<div className="relative flex flex-col items-center text-center">
										<div className="relative mb-6">
											<div className="flex h-32 w-32 items-center justify-center rounded-3xl border-2 border-border bg-card shadow-lg transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10">
												<step.icon className="h-12 w-12 text-primary transition-transform duration-300 group-hover:scale-110" />
											</div>
											<div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
												{index + 1}
											</div>
										</div>
										<h3 className="text-lg font-semibold mb-2">{step.title}</h3>
										<p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-24 bg-muted/30">
				<div className="container">
					<div className="mx-auto max-w-5xl">
						<div className="grid gap-8 md:grid-cols-4">
							{[
								{ value: '300+', label: 'Edge Locations', icon: Globe },
								{ value: '<50ms', label: 'Global Latency', icon: Zap },
								{ value: '99.99%', label: 'Uptime SLA', icon: Shield },
								{ value: '10K+', label: 'Agents Deployed', icon: Bot },
							].map((stat) => (
								<div
									key={stat.label}
									className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
								>
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
									<stat.icon className="mx-auto h-8 w-8 text-primary mb-4" />
									<div className="text-4xl font-bold text-foreground mb-2">{stat.value}</div>
									<div className="text-sm text-muted-foreground">{stat.label}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Testimonials */}
			<section className="py-24">
				<div className="container">
					<div className="mx-auto max-w-2xl text-center mb-16">
						<Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
							Testimonials
						</Badge>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
							Loved by developers worldwide
						</h2>
					</div>

					<div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
						{testimonials.map((testimonial, i) => (
							<Card key={i} className="border-border/50 bg-card/50">
								<CardContent className="pt-6">
									<div className="flex gap-1 mb-4">
										{[...Array(5)].map((_, i) => (
											<Sparkles key={i} className="h-4 w-4 text-primary" />
										))}
									</div>
									<p className="text-foreground mb-6 leading-relaxed">"{testimonial.quote}"</p>
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-violet-600" />
										<div>
											<p className="font-semibold text-sm">{testimonial.author}</p>
											<p className="text-xs text-muted-foreground">{testimonial.role}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-24">
				<div className="container">
					<div className="mx-auto max-w-4xl">
						<div className="relative overflow-hidden rounded-3xl">
							{/* Background gradient */}
							<div className="absolute inset-0 bg-gradient-to-br from-primary via-violet-600 to-purple-700" />
							<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />

							<div className="relative px-8 py-20 text-center text-white sm:px-16">
								<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
									Ready to build your first agent?
								</h2>
								<p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
									Join thousands of developers building the future of AI-powered applications.
									Free to start, scales with you.
								</p>
								<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
									<Link href="/sign-up">
										<Button
											size="lg"
											className="gap-2 px-8 h-14 bg-white text-primary hover:bg-white/90 shadow-xl"
										>
											Get Started Free
											<ArrowRight className="h-5 w-5" />
										</Button>
									</Link>
									<Link href="https://github.com">
										<Button
											size="lg"
											variant="outline"
											className="gap-2 px-8 h-14 border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur"
										>
											<GitBranch className="h-5 w-5" />
											Star on GitHub
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-border/50 py-16 bg-muted/20">
				<div className="container">
					<div className="flex flex-col items-center justify-between gap-8 md:flex-row">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
								<Sparkles className="h-5 w-5 text-primary-foreground" />
							</div>
							<span className="font-bold text-xl tracking-tight">Hare</span>
						</div>
						<nav className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
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
						</nav>
						<div className="text-sm text-muted-foreground">
							Built with{' '}
							<Link
								href="https://cloudflare.com"
								className="text-primary hover:underline"
								target="_blank"
							>
								Cloudflare Workers
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
