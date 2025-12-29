import { PublicPageFooter, PublicPageHeader } from '@hare/app'
import { Badge } from '@hare/ui/components/badge'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Shield } from 'lucide-react'

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
			<PublicPageHeader Link={Link} />

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

			<PublicPageFooter Link={Link} maxWidth="max-w-3xl" />
		</div>
	)
}
