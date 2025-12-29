import { APP_CONFIG } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Rabbit, Shield } from 'lucide-react'

export const Route = createFileRoute('/privacy')({
	component: PrivacyPage,
	head: () => ({
		title: 'Privacy Policy - Hare',
		meta: [{ name: 'description', content: 'Privacy policy for the Hare AI agent platform' }],
	}),
})

function PrivacyPage() {
	const lastUpdated = 'December 29, 2025'

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

			{/* Content */}
			<main className="flex-1 px-4 py-12 sm:py-16">
				<article className="container max-w-3xl mx-auto">
					<div className="text-center mb-8">
						<Badge
							variant="secondary"
							className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
						>
							<Shield className="h-3 w-3 mr-1" />
							Legal
						</Badge>
						<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
						<p className="mt-2 text-muted-foreground">Last updated: {lastUpdated}</p>
					</div>

					<div className="prose prose-gray dark:prose-invert max-w-none">
						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
							<p className="text-muted-foreground mb-4">
								Welcome to Hare. We respect your privacy and are committed to protecting your
								personal data. This privacy policy explains how we collect, use, and safeguard your
								information when you use our AI agent platform.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
							<p className="text-muted-foreground mb-4">
								We collect information that you provide directly to us:
							</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
								<li>Account information (email, name)</li>
								<li>Agent configurations and settings</li>
								<li>Conversation data with your AI agents</li>
								<li>Usage analytics and performance metrics</li>
							</ul>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
							<p className="text-muted-foreground mb-4">We use the collected information to:</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
								<li>Provide and maintain the Hare platform</li>
								<li>Process and complete transactions</li>
								<li>Send you technical notices and support messages</li>
								<li>Improve our services and develop new features</li>
								<li>Monitor and analyze usage trends</li>
							</ul>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
							<p className="text-muted-foreground mb-4">
								Your data is stored securely on Cloudflare's global network. We implement
								industry-standard security measures including encryption in transit and at rest,
								access controls, and regular security audits.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">5. Data Sharing</h2>
							<p className="text-muted-foreground mb-4">
								We do not sell your personal information. We may share data with:
							</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
								<li>Service providers who assist in operating our platform</li>
								<li>Law enforcement when required by law</li>
								<li>Third parties with your explicit consent</li>
							</ul>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
							<p className="text-muted-foreground mb-4">You have the right to:</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
								<li>Access your personal data</li>
								<li>Correct inaccurate data</li>
								<li>Request deletion of your data</li>
								<li>Export your data</li>
								<li>Opt out of marketing communications</li>
							</ul>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">7. Cookies</h2>
							<p className="text-muted-foreground mb-4">
								We use essential cookies to maintain your session and preferences. We do not use
								third-party tracking cookies for advertising purposes.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
							<p className="text-muted-foreground mb-4">
								If you have questions about this privacy policy, please contact us through our
								GitHub repository or support channels.
							</p>
						</section>
					</div>
				</article>
			</main>

			{/* Footer */}
			<footer className="border-t py-8 px-4">
				<div className="container max-w-3xl mx-auto">
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
							<Link to="/docs" className="hover:text-primary">
								Docs
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
