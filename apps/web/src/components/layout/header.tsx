'use client'

import { Bell, Command, Menu, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { UserNav } from './user-nav'
import { cn } from '@workspace/ui/lib/utils'

export function Header() {
	const [searchFocused, setSearchFocused] = useState(false)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	return (
		<header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
			<div className="flex h-16 items-center gap-4 px-6">
				{/* Mobile menu button */}
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					{mobileMenuOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</Button>

				{/* Search */}
				<div className="hidden md:flex flex-1 max-w-lg">
					<div
						className={cn(
							'relative w-full transition-all duration-300',
							searchFocused && 'scale-[1.02]'
						)}
					>
						<Search
							className={cn(
								'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200',
								searchFocused ? 'text-primary' : 'text-muted-foreground'
							)}
						/>
						<Input
							placeholder="Search agents, tools, settings..."
							className={cn(
								'pl-10 pr-20 h-10 bg-muted/50 border-transparent rounded-xl transition-all duration-200',
								'focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20'
							)}
							onFocus={() => setSearchFocused(true)}
							onBlur={() => setSearchFocused(false)}
						/>
						<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
							<kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
								<Command className="h-3 w-3" />K
							</kbd>
						</div>
					</div>
				</div>

				{/* Spacer */}
				<div className="flex-1 md:hidden" />

				{/* Right side */}
				<div className="flex items-center gap-2">
					{/* Mobile search button */}
					<Button variant="ghost" size="icon" className="md:hidden">
						<Search className="h-5 w-5" />
					</Button>

					{/* Notifications */}
					<Button
						variant="ghost"
						size="icon"
						className="relative hover:bg-primary/10 transition-colors"
					>
						<Bell className="h-5 w-5" />
						<span className="absolute top-2 right-2 flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
						</span>
					</Button>

					{/* Divider */}
					<div className="hidden sm:block h-6 w-px bg-border/50 mx-1" />

					{/* User Nav */}
					<UserNav />
				</div>
			</div>
		</header>
	)
}
