import { APP_CONFIG } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Button } from '@hare/ui/components/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, Rabbit } from 'lucide-react'

export const Route = createFileRoute('/terms')({
	component: TermsPage,
	head: () => ({
		title: 'Terms of Service - Hare',
		meta: [{ name: 'description', content: 'Terms of service for the Hare AI agent platform' }],
	}),
})

function TermsPage() {
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
							<FileText className="h-3 w-3 mr-1" />
							Legal
						</Badge>
						<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
						<p className="mt-2 text-muted-foreground">Last updated: {lastUpdated}</p>
					</div>

					<div className="prose prose-gray dark:prose-invert max-w-none">
						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
							<p className="text-muted-foreground mb-4">
								By accessing or using Hare, you agree to be bound by these Terms of Service. If you
								do not agree to these terms, please do not use our service.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
							<p className="text-muted-foreground mb-4">
								Hare is an AI agent platform that allows users to create, deploy, and manage AI
								agents on Cloudflare's edge network. The service includes agent creation tools,
								conversation management, and API access.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
							<p className="text-muted-foreground mb-4">To use Hare, you must:</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
								<li>Create an account with accurate information</li>
								<li>Maintain the security of your account credentials</li>
								<li>Notify us immediately of any unauthorized access</li>
								<li>Be at least 18 years old or have parental consent</li>
							</ul>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
							<p className="text-muted-foreground mb-4">You agree not to use Hare to:</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
								<li>Violate any applicable laws or regulations</li>
								<li>Infringe on intellectual property rights</li>
								<li>Generate harmful, abusive, or illegal content</li>
								<li>Attempt to gain unauthorized access to our systems</li>
								<li>Interfere with or disrupt the service</li>
								<li>Create agents that impersonate real individuals</li>
								<li>Engage in spam or automated abuse</li>
							</ul>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">5. Intellectual Property</h2>
							<p className="text-muted-foreground mb-4">
								You retain ownership of the agents and content you create. By using Hare, you grant
								us a license to host and process your content as necessary to provide the service.
								The Hare platform, including its software and branding, remains our property.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">6. AI-Generated Content</h2>
							<p className="text-muted-foreground mb-4">
								AI agents may generate content that is incorrect, inappropriate, or unexpected. You
								are responsible for reviewing and monitoring the output of your agents. We are not
								liable for any harm caused by AI-generated content.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">7. Service Availability</h2>
							<p className="text-muted-foreground mb-4">
								We strive for high availability but do not guarantee uninterrupted service. We may
								modify, suspend, or discontinue features with reasonable notice. Scheduled
								maintenance will be communicated in advance when possible.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
							<p className="text-muted-foreground mb-4">
								To the maximum extent permitted by law, Hare is provided "as is" without warranties.
								We are not liable for indirect, incidental, or consequential damages arising from
								your use of the service.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">9. Termination</h2>
							<p className="text-muted-foreground mb-4">
								We may terminate or suspend your account for violations of these terms. You may
								delete your account at any time. Upon termination, your right to use the service
								ceases, and we may delete your data after a reasonable period.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">10. Changes to Terms</h2>
							<p className="text-muted-foreground mb-4">
								We may update these terms from time to time. Continued use of the service after
								changes constitutes acceptance. We will notify users of material changes via email
								or in-app notification.
							</p>
						</section>

						<section className="mb-8">
							<h2 className="text-xl font-semibold mb-4">11. Contact</h2>
							<p className="text-muted-foreground mb-4">
								For questions about these terms, please contact us through our GitHub repository or
								support channels.
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
							<Link to="/privacy" className="hover:text-primary">
								Privacy
							</Link>
						</nav>
					</div>
				</div>
			</footer>
		</div>
	)
}
