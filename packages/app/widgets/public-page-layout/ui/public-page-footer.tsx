'use client'

import { APP_CONFIG } from '@hare/config'
import { Rabbit } from 'lucide-react'

export interface PublicPageFooterProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	/** Maximum width class for the container. Defaults to 'max-w-4xl' */
	maxWidth?: string
}

/**
 * Footer widget for public pages (docs, privacy, terms, etc.).
 *
 * @param Link - Router Link component
 * @param maxWidth - Maximum width class for the container
 */
export function PublicPageFooter({ Link, maxWidth = 'max-w-4xl' }: PublicPageFooterProps) {
	return (
		<footer className="border-t py-8 px-4 mt-auto">
			<div className={`container ${maxWidth} mx-auto`}>
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
						<Link to="/terms" className="hover:text-primary">
							Terms
						</Link>
					</nav>
				</div>
			</div>
		</footer>
	)
}
