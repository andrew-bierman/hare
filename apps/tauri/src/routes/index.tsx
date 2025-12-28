import { APP_CONFIG, LANDING_PAGE, NAV_ITEMS, UI_TEXT } from '@hare/config'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
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
	Rabbit,
	Shield,
	Terminal,
	Zap,
} from 'lucide-react'
import { useAuth } from '@hare/app/providers'

export const Route = createFileRoute('/')({
	component: LandingPage,
})

// Icon mapping for dynamic rendering
const ICONS = {
	Bot,
	Boxes,
	Cloud,
	Code,
	Globe,
	Layers,
	MessageSquare,
	Play,
	Shield,
	Terminal,
	Zap,
	GitBranch,
} as const

function LandingPage() {
	const { data: session, isPending } = useAuth()
	const { hero, features, steps, stats, badges, cta, codeExample } = LANDING_PAGE

	return (
		<div className="flex min-h-screen flex-col">
			{/* Navigation */}
			<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center justify-between px-4 sm:h-16">
					<Link to="/" className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
							<Rabbit className="h-5 w-5 text-white" />
						</div>
						<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							{APP_CONFIG.name}
						</span>
					</Link>

					<nav className="hidden md:flex items-center gap-6">
						{NAV_ITEMS.main.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="text-sm text-muted-foreground hover:text-foreground"
								{...('external' in item && item.external
									? { target: '_blank', rel: 'noopener noreferrer' }
									: {})}
							>
								{item.label}
							</a>
						))}
					</nav>

					<div className="flex items-center gap-2">
						{isPending ? (
							<div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
						) : session?.user ? (
							<Link to="/dashboard">
								<Button size="sm" className="gap-2">
									<Rabbit className="h-4 w-4" />
									Dashboard
								</Button>
							</Link>
						) : (
							<>
								<Link to="/sign-in" className="hidden sm:block">
									<Button variant="ghost" size="sm">
										{UI_TEXT.signIn}
									</Button>
								</Link>
								<Link to="/sign-up">
									<Button size="sm">{UI_TEXT.getStarted}</Button>
								</Link>
							</>
						)}
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="px-4 py-12 sm:py-16 md:py-24 lg:py-32">
				<div className="container max-w-4xl mx-auto text-center">
					<Badge
						variant="secondary"
						className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
					>
						<Rabbit className="h-3 w-3 mr-1" />
						{hero.badge}
					</Badge>

					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
						{hero.title}{' '}
						<span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
							{hero.titleHighlight}
						</span>{' '}
						{hero.titleSuffix}
					</h1>

					<p className="mt-4 text-base text-muted-foreground sm:text-lg md:text-xl max-w-2xl mx-auto">
						{hero.description}
					</p>

					{/* CTA - stack on mobile */}
					<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
						<Link to="/sign-up" className="w-full sm:w-auto">
							<Button
								size="lg"
								className="w-full sm:w-auto gap-2 h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
							>
								{hero.primaryCta}
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
						<Link to="/dashboard" className="w-full sm:w-auto">
							<Button
								size="lg"
								variant="outline"
								className="w-full sm:w-auto gap-2 h-12 border-orange-300 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
							>
								<Rabbit className="h-4 w-4" />
								{hero.secondaryCta}
							</Button>
						</Link>
					</div>

					{/* Badges */}
					<div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
						{badges.map((badge) => {
							const Icon = ICONS[badge.icon as keyof typeof ICONS]
							return (
								<div key={badge.label} className="flex items-center gap-1.5">
									{Icon && <Icon className="h-4 w-4" />}
									<span>{badge.label}</span>
								</div>
							)
						})}
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
							<code className="text-muted-foreground">{codeExample}</code>
						</pre>
					</div>
				</div>
			</section>

			{/* Features - 1 col mobile, 2 col tablet, 3 col desktop */}
			<section id="features" className="px-4 py-12 sm:py-16 md:py-24 bg-muted/50">
				<div className="container max-w-6xl mx-auto">
					<div className="text-center mb-8 sm:mb-12">
						<Badge variant="outline" className="mb-3">
							Features
						</Badge>
						<h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">Everything you need</h2>
						<p className="mt-2 text-muted-foreground">From prototype to production in minutes.</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => {
							const Icon = ICONS[feature.icon as keyof typeof ICONS]
							return (
								<Card key={feature.title} className="h-full">
									<CardHeader className="pb-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
											{Icon && <Icon className="h-5 w-5 text-primary" />}
										</div>
										<CardTitle className="text-lg">{feature.title}</CardTitle>
									</CardHeader>
									<CardContent className="pt-0">
										<CardDescription>{feature.description}</CardDescription>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>
			</section>

			{/* How it Works - vertical on mobile, horizontal on desktop */}
			<section id="how-it-works" className="px-4 py-12 sm:py-16 md:py-24">
				<div className="container max-w-4xl mx-auto">
					<div className="text-center mb-8 sm:mb-12">
						<Badge variant="outline" className="mb-3">
							How it Works
						</Badge>
						<h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
							{steps.length} simple steps
						</h2>
						<p className="mt-2 text-muted-foreground">Build your first agent in under 5 minutes.</p>
					</div>

					<div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
						{steps.map((step, index) => {
							const Icon = ICONS[step.icon as keyof typeof ICONS]
							return (
								<div key={step.title} className="flex gap-4 md:flex-col md:text-center">
									<div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background md:mx-auto">
										{Icon && <Icon className="h-5 w-5 text-primary" />}
									</div>
									<div>
										<span className="text-xs font-medium text-muted-foreground">
											Step {index + 1}
										</span>
										<h3 className="font-semibold">{step.title}</h3>
										<p className="text-sm text-muted-foreground">{step.description}</p>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* Stats - 2x2 grid on mobile, 4 col on desktop */}
			<section className="px-4 py-12 sm:py-16 md:py-24 bg-muted/50">
				<div className="container max-w-3xl mx-auto">
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{stats.map((stat) => (
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
					<div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-6 sm:p-8 md:p-12 text-center text-white shadow-xl shadow-orange-500/25">
						<div className="flex justify-center mb-4">
							<Rabbit className="h-12 w-12 text-white/90" />
						</div>
						<h2 className="text-xl font-bold sm:text-2xl md:text-3xl">{cta.title}</h2>
						<p className="mt-3 text-white/80 text-sm sm:text-base">{cta.description}</p>
						<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link to="/sign-up" className="w-full sm:w-auto">
								<Button
									size="lg"
									variant="secondary"
									className="w-full sm:w-auto gap-2 h-12 bg-white text-orange-600 hover:bg-orange-50"
								>
									{cta.primaryCta}
									<ArrowRight className="h-4 w-4" />
								</Button>
							</Link>
							<a href={APP_CONFIG.repository} className="w-full sm:w-auto">
								<Button
									size="lg"
									variant="outline"
									className="w-full sm:w-auto gap-2 h-12 border-white/30 text-white hover:bg-white/10"
								>
									<GitBranch className="h-4 w-4" />
									{cta.secondaryCta}
								</Button>
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8 px-4">
				<div className="container">
					<div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
						<div className="flex items-center gap-2">
							<div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-orange-500 to-amber-500">
								<Rabbit className="h-3.5 w-3.5 text-white" />
							</div>
							<span className="font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
								{APP_CONFIG.name}
							</span>
						</div>
						<nav className="flex flex-wrap justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
							{NAV_ITEMS.footer.map((item) => (
								<a
									key={item.href}
									href={item.href}
									className="hover:text-orange-600 px-2 min-h-[44px] flex items-center"
								>
									{item.label}
								</a>
							))}
						</nav>
					</div>
				</div>
			</footer>
		</div>
	)
}
