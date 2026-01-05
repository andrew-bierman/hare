'use client'

import { useState, useEffect } from 'react'
import { Button } from '@hare/ui/components/button'
import { Menu, Rabbit, SearchIcon } from 'lucide-react'
import { config } from '@hare/config'
import { CommandSearch } from './command-search'

export interface HeaderProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	UserNav?: React.ComponentType
	onMobileMenuToggle?: () => void
	onNavigate?: (path: string) => void
}

/**
 * Header widget for dashboard.
 * Mobile: hamburger + logo + user nav
 * Desktop: command search + user nav (sidebar provides logo)
 */
export function Header({ Link, UserNav, onMobileMenuToggle, onNavigate }: HeaderProps) {
	const [open, setOpen] = useState(false)

	// Cmd+K to open search
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((open) => !open)
			}
		}
		document.addEventListener('keydown', down)
		return () => document.removeEventListener('keydown', down)
	}, [])

	return (
		<>
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex h-14 items-center gap-4 px-4 sm:px-6">
					{/* Mobile: hamburger + logo */}
					<div className="flex items-center gap-3 md:hidden">
						{onMobileMenuToggle && (
							<Button variant="ghost" size="icon" className="h-10 w-10" onClick={onMobileMenuToggle}>
								<Menu className="h-5 w-5" />
							</Button>
						)}
						<Link to="/dashboard" className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm">
								<Rabbit className="h-4 w-4 text-white" />
							</div>
							<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
								{config.app.name}
							</span>
						</Link>
					</div>

					{/* Desktop: Command search trigger */}
					<div className="hidden md:flex flex-1 max-w-md">
						<Button
							variant="outline"
							className="w-full justify-start text-sm text-muted-foreground h-10 bg-muted/50 border-transparent hover:bg-muted hover:border-border"
							onClick={() => setOpen(true)}
						>
							<SearchIcon className="mr-2 h-4 w-4" />
							<span className="flex-1 text-left">Search agents, tools, pages...</span>
							<kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
								<span className="text-xs">&#8984;</span>K
							</kbd>
						</Button>
					</div>

					{/* Spacer */}
					<div className="flex-1" />

					{/* Right side */}
					<div className="flex items-center gap-2">
						{/* Mobile search button */}
						<Button
							variant="ghost"
							size="icon"
							className="md:hidden h-10 w-10"
							onClick={() => setOpen(true)}
						>
							<SearchIcon className="h-5 w-5" />
						</Button>

						{/* User nav */}
						{UserNav && <UserNav />}
					</div>
				</div>
			</header>

			{/* Command Search Dialog */}
			<CommandSearch open={open} onOpenChange={setOpen} onNavigate={onNavigate} />
		</>
	)
}
