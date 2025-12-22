'use client'

import { Activity, Bot, ChevronRight, HelpCircle, Home, Settings, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@workspace/ui/lib/utils'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { WorkspaceSwitcher } from './workspace-switcher'

const routes = [
	{
		label: 'Dashboard',
		icon: Home,
		href: '/dashboard',
		description: 'Overview & stats',
	},
	{
		label: 'Agents',
		icon: Bot,
		href: '/dashboard/agents',
		description: 'Manage AI agents',
	},
	{
		label: 'Tools',
		icon: Wrench,
		href: '/dashboard/tools',
		description: 'Configure tools',
	},
	{
		label: 'Usage',
		icon: Activity,
		href: '/dashboard/usage',
		description: 'Analytics & metrics',
	},
	{
		label: 'Settings',
		icon: Settings,
		href: '/dashboard/settings',
		description: 'Account settings',
	},
]

export function Sidebar() {
	const pathname = usePathname()

	const isActive = (href: string) => {
		if (href === '/dashboard') {
			return pathname === href
		}
		return pathname.startsWith(href)
	}

	return (
		<div className="flex flex-col h-full bg-sidebar/50 backdrop-blur-xl text-sidebar-foreground border-r border-sidebar-border">
			{/* Logo */}
			<div className="p-6 pb-4">
				<Link href="/dashboard" className="flex items-center gap-3 group">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
						<Sparkles className="h-5 w-5 text-primary-foreground" />
					</div>
					<div className="flex items-center gap-2">
						<span className="font-bold text-xl tracking-tight">Hare</span>
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0"
						>
							Beta
						</Badge>
					</div>
				</Link>
			</div>

			{/* Workspace Switcher */}
			<div className="px-4 mb-4">
				<WorkspaceSwitcher />
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-2">
				<div className="space-y-1">
					{routes.map((route) => {
						const active = isActive(route.href)
						return (
							<Link
								key={route.href}
								href={route.href}
								className={cn(
									'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
									active
										? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
										: 'text-sidebar-foreground hover:bg-sidebar-accent'
								)}
							>
								<div
									className={cn(
										'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
										active
											? 'bg-primary-foreground/20'
											: 'bg-sidebar-accent group-hover:bg-sidebar-accent/80'
									)}
								>
									<route.icon
										className={cn(
											'h-[18px] w-[18px] transition-colors',
											active
												? 'text-primary-foreground'
												: 'text-muted-foreground group-hover:text-foreground'
										)}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<div
										className={cn(
											'text-sm font-medium truncate',
											active ? 'text-primary-foreground' : ''
										)}
									>
										{route.label}
									</div>
									{!active && (
										<div className="text-xs text-muted-foreground truncate">
											{route.description}
										</div>
									)}
								</div>
								{active && (
									<ChevronRight className="h-4 w-4 text-primary-foreground/70" />
								)}
							</Link>
						)
					})}
				</div>
			</nav>

			{/* Footer */}
			<div className="p-4 space-y-3">
				{/* Help Card */}
				<div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-4">
					<div className="flex items-center gap-2.5 mb-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<HelpCircle className="h-4 w-4 text-primary" />
						</div>
						<span className="text-sm font-medium">Need help?</span>
					</div>
					<p className="text-xs text-muted-foreground mb-3 leading-relaxed">
						Check out the docs or join our community for support.
					</p>
					<Link href="/docs">
						<Button
							variant="secondary"
							size="sm"
							className="w-full gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-0"
						>
							View Documentation
							<ChevronRight className="h-3.5 w-3.5" />
						</Button>
					</Link>
				</div>
			</div>
		</div>
	)
}
