'use client'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Bell, Menu, Search } from 'lucide-react'
import { UserNav } from './user-nav'

export function Header() {
	return (
		<header className="sticky top-0 z-40 border-b bg-background">
			<div className="flex h-14 items-center gap-4 px-4">
				{/* Mobile menu button */}
				<Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]">
					<Menu className="h-5 w-5" />
				</Button>

				{/* Search - hidden on mobile */}
				<div className="hidden md:flex flex-1 max-w-md">
					<div className="relative w-full">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input placeholder="Search..." className="pl-9 h-10" />
					</div>
				</div>

				{/* Spacer on mobile */}
				<div className="flex-1 md:hidden" />

				{/* Right side */}
				<div className="flex items-center gap-2">
					{/* Mobile search */}
					<Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]">
						<Search className="h-5 w-5" />
					</Button>

					{/* Notifications */}
					<Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
						<Bell className="h-5 w-5" />
						<span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
					</Button>

					{/* User */}
					<UserNav />
				</div>
			</div>
		</header>
	)
}
