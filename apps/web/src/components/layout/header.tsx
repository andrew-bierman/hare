'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { UserNav } from './user-nav'

export function Header() {
	return (
		<header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-16 items-center gap-4 px-6">
				{/* Mobile menu button */}
				<Button variant="ghost" size="icon" className="md:hidden">
					<Menu className="h-5 w-5" />
				</Button>

				{/* Search */}
				<div className="hidden md:flex flex-1 max-w-md">
					<div className="relative w-full">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search agents, tools..."
							className="pl-10 bg-muted/50 border-transparent focus:border-border focus:bg-background"
						/>
					</div>
				</div>

				{/* Spacer */}
				<div className="flex-1 md:hidden" />

				{/* Right side */}
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="icon" className="relative">
						<Bell className="h-5 w-5" />
						<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
					</Button>
					<UserNav />
				</div>
			</div>
		</header>
	)
}
