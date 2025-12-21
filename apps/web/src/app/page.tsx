import { ArrowRight, Bot, Code, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

export default function LandingPage() {
	const features = [
		{
			title: 'Build AI Agents',
			description:
				'Create powerful AI agents with natural language understanding and custom behaviors',
			icon: Bot,
		},
		{
			title: 'Lightning Fast',
			description: 'Deploy and scale your agents instantly with our optimized infrastructure',
			icon: Zap,
		},
		{
			title: 'Developer First',
			description: 'Built for developers with a clean API, webhooks, and extensive documentation',
			icon: Code,
		},
	]

	return (
		<div className="flex flex-col">
			<section className="container space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
				<div className="mx-auto flex max-w-[64rem] flex-col items-center gap-4 text-center">
					<h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
						Build AI Agents in Minutes
					</h1>
					<p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
						Hare is the fastest way to create, deploy, and manage AI agents. No infrastructure setup
						required. Start building in seconds.
					</p>
					<div className="flex gap-4">
						<Link href="/sign-up">
							<Button size="lg" className="gap-2">
								Get Started <ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
						<Link href="/dashboard">
							<Button size="lg" variant="outline">
								View Demo
							</Button>
						</Link>
					</div>
				</div>
			</section>

			<section className="container space-y-6 py-8 md:py-12 lg:py-24 bg-muted/50">
				<div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
					<h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
					<p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
						Everything you need to build and deploy production-ready AI agents
					</p>
				</div>
				<div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
					{features.map((feature) => (
						<Card key={feature.title} className="relative overflow-hidden">
							<CardHeader>
								<feature.icon className="h-12 w-12 mb-4 text-primary" />
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription>{feature.description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</section>

			<section className="container space-y-6 py-8 md:py-12 lg:py-24">
				<div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
					<h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
						Ready to get started?
					</h2>
					<p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
						Join thousands of developers building the future with AI agents
					</p>
					<Link href="/sign-up">
						<Button size="lg" className="gap-2">
							Create Your First Agent <ArrowRight className="h-4 w-4" />
						</Button>
					</Link>
				</div>
			</section>
		</div>
	)
}
