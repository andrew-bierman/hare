'use client'

import { Config } from '@hare/config'
import { Button } from '@hare/ui/components/button'
import { Rabbit } from 'lucide-react'

export interface PublicPageHeaderProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
}

/**
 * Header widget for public pages (docs, privacy, terms, etc.).
 *
 * @param Link - Router Link component
 */
export function PublicPageHeader({ Link }: PublicPageHeaderProps) {
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
				<Link to="/" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
						<Rabbit className="h-5 w-5 text-white" />
					</div>
					<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
						{Config.app.name}
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
	)
}
