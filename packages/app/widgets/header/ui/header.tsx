'use client'

import { Button } from '@hare/ui/components/button'
import { Input } from '@hare/ui/components/input'
import { Bell, Menu, Rabbit, Search } from 'lucide-react'
import { APP_CONFIG, DASHBOARD_CONTENT } from '@hare/config'

export interface HeaderProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	UserNav?: React.ComponentType
	onMobileMenuToggle?: () => void
}

/**
 * Header widget for dashboard.
 *
 * @param Link - Router Link component
 * @param UserNav - Optional user navigation component
 * @param onMobileMenuToggle - Optional callback for mobile menu toggle
 */
export function Header({ Link, UserNav, onMobileMenuToggle }: HeaderProps) {
	return (
		<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center gap-4 px-4 sm:px-6">
				{/* Left side - Mobile menu + Logo (mobile only) */}
				<div className="flex items-center gap-3 md:hidden">
					<Button variant="ghost" size="icon" className="h-10 w-10" onClick={onMobileMenuToggle}>
						<Menu className="h-5 w-5" />
					</Button>
					<Link to="/dashboard" className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm">
							<Rabbit className="h-4 w-4 text-white" />
						</div>
						<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							{APP_CONFIG.name}
						</span>
					</Link>
				</div>

				{/* Center - Search (desktop only) */}
				<div className="hidden md:block flex-1 max-w-md">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
						<Input
							placeholder={DASHBOARD_CONTENT.header.searchPlaceholder}
							className="w-full pl-9 h-10 bg-muted/50 border-transparent focus:border-orange-300 focus:bg-background transition-colors"
						/>
					</div>
				</div>

				{/* Spacer for desktop */}
				<div className="hidden md:block flex-1" />

				{/* Right side */}
				<div className="flex items-center gap-1 sm:gap-2 ml-auto">
					{/* Mobile search button */}
					<Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
						<Search className="h-5 w-5" />
					</Button>

					{/* Notifications */}
					<Button variant="ghost" size="icon" className="relative h-10 w-10">
						<Bell className="h-5 w-5" />
						<span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background" />
					</Button>

					{/* User */}
					{UserNav && <UserNav />}
				</div>
			</div>
		</header>
	)
}
