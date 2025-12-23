'use client'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Bell, Menu, Rabbit, Search } from 'lucide-react'
import Link from 'next/link'
import { UserNav } from './user-nav'

export function Header() {
	return (
		<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
				{/* Left side - Mobile menu + Logo on mobile */}
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
						<Menu className="h-5 w-5" />
					</Button>

					{/* Mobile logo */}
					<Link href="/dashboard" className="flex items-center gap-2 md:hidden">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
							<Rabbit className="h-4 w-4 text-white" />
						</div>
						<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Hare</span>
					</Link>
				</div>

				{/* Center - Search (hidden on mobile) */}
				<div className="hidden md:flex flex-1 max-w-md">
					<div className="relative w-full">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search agents, tools..."
							className="pl-9 h-10 bg-muted/50 border-transparent focus:border-orange-300 focus:bg-background transition-colors"
						/>
					</div>
				</div>

				{/* Right side */}
				<div className="flex items-center gap-1 sm:gap-2">
					{/* Mobile search */}
					<Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
						<Search className="h-5 w-5" />
					</Button>

					{/* Notifications */}
					<Button variant="ghost" size="icon" className="relative h-10 w-10">
						<Bell className="h-5 w-5" />
						<span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background" />
					</Button>

					{/* User */}
					<UserNav />
				</div>
			</div>
		</header>
	)
}
