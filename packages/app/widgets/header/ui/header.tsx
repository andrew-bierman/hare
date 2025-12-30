'use client'

import { useState, useEffect } from 'react'
import { Button } from '@hare/ui/components/button'
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@hare/ui/components/command'
import { Bell, Bot, Home, Menu, Rabbit, Search, Settings, Wrench } from 'lucide-react'
import { APP_CONFIG, DASHBOARD_CONTENT } from '@hare/config'

export interface HeaderProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	UserNav?: React.ComponentType
	onNavigate?: (path: string) => void
}

/**
 * Header widget for dashboard.
 *
 * @param Link - Router Link component
 * @param UserNav - Optional user navigation component
 * @param onNavigate - Optional callback for navigation (for command palette)
 */
export function Header({ Link, UserNav, onNavigate }: HeaderProps) {
	const [open, setOpen] = useState(false)

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

	const handleSelect = (path: string) => {
		setOpen(false)
		onNavigate?.(path)
	}

	return (
		<>
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
					{/* Left side - Mobile menu + Logo (mobile only) */}
					<div className="flex items-center gap-3 md:hidden">
						<Button variant="ghost" size="icon" className="h-10 w-10">
							<Menu className="h-5 w-5" />
						</Button>

						<Link to="/dashboard" className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
								<Rabbit className="h-4 w-4 text-white" />
							</div>
							<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
								{APP_CONFIG.name}
							</span>
						</Link>
					</div>

					{/* Center - Search trigger (desktop) */}
					<div className="hidden md:flex flex-1 max-w-md">
						<Button
							variant="outline"
							className="relative h-10 w-full justify-start text-sm text-muted-foreground bg-muted/50 border-transparent hover:border-orange-300 hover:bg-background"
							onClick={() => setOpen(true)}
						>
							<Search className="mr-2 h-4 w-4" />
							<span>{DASHBOARD_CONTENT.header.searchPlaceholder}</span>
							<kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
								<span className="text-xs">⌘</span>K
							</kbd>
						</Button>
					</div>

					{/* Right side */}
					<div className="flex items-center gap-1 sm:gap-2">
						{/* Mobile search */}
						<Button
							variant="ghost"
							size="icon"
							className="md:hidden h-10 w-10"
							onClick={() => setOpen(true)}
						>
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

			{/* Command palette */}
			<CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search for pages and actions">
				<CommandInput placeholder="Type to search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Pages">
						<CommandItem onSelect={() => handleSelect('/dashboard')}>
							<Home className="mr-2 h-4 w-4" />
							<span>Dashboard</span>
						</CommandItem>
						<CommandItem onSelect={() => handleSelect('/dashboard/agents')}>
							<Bot className="mr-2 h-4 w-4" />
							<span>Agents</span>
						</CommandItem>
						<CommandItem onSelect={() => handleSelect('/dashboard/tools')}>
							<Wrench className="mr-2 h-4 w-4" />
							<span>Tools</span>
						</CommandItem>
						<CommandItem onSelect={() => handleSelect('/dashboard/settings')}>
							<Settings className="mr-2 h-4 w-4" />
							<span>Settings</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	)
}
