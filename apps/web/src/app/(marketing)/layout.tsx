import Link from 'next/link'
import { Button } from '../../components/ui/button'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen flex flex-col">
			<header className="border-b border-border">
				<div className="container flex h-16 items-center justify-between">
					<Link href="/" className="flex items-center space-x-2">
						<h1 className="text-2xl font-bold">Hare</h1>
					</Link>
					<nav className="flex items-center space-x-4">
						<Link href="/sign-in">
							<Button variant="ghost">Sign In</Button>
						</Link>
						<Link href="/sign-up">
							<Button>Get Started</Button>
						</Link>
					</nav>
				</div>
			</header>
			<main className="flex-1">{children}</main>
			<footer className="border-t border-border py-6 md:py-0">
				<div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
					<p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
						Built with Hare. The fastest way to build AI agents.
					</p>
				</div>
			</footer>
		</div>
	)
}
