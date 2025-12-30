'use client'

import { Rabbit } from 'lucide-react'
import { APP_CONFIG } from '@hare/config'

export interface HeaderProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	UserNav?: React.ComponentType
	onMobileMenuToggle?: () => void
}

/**
 * Header widget for dashboard.
 * Clean, minimal header with mobile logo and user navigation.
 */
export function Header({ Link, UserNav }: HeaderProps) {
	return (
		<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center justify-between px-4 sm:px-6">
				{/* Mobile logo */}
				<Link to="/dashboard" className="flex items-center gap-2 md:hidden">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm">
						<Rabbit className="h-4 w-4 text-white" />
					</div>
					<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
						{APP_CONFIG.name}
					</span>
				</Link>

				{/* Spacer for desktop (sidebar provides branding) */}
				<div className="hidden md:block" />

				{/* Right side - User nav only */}
				<div className="flex items-center">
					{UserNav && <UserNav />}
				</div>
			</div>
		</header>
	)
}
