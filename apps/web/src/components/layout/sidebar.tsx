'use client'

import { Activity, Bot, Home, Settings, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@workspace/ui/lib/utils'
import { Badge } from '@workspace/ui/components/badge'
import { WorkspaceSwitcher } from './workspace-switcher'

const routes = [
	{
		label: 'Dashboard',
		icon: Home,
		href: '/dashboard',
	},
	{
		label: 'Agents',
		icon: Bot,
		href: '/dashboard/agents',
	},
	{
		label: 'Tools',
		icon: Wrench,
		href: '/dashboard/tools',
	},
	{
		label: 'Usage',
		icon: Activity,
		href: '/dashboard/usage',
	},
	{
		label: 'Settings',
		icon: Settings,
		href: '/dashboard/settings',
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
		<div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
			{/* Logo */}
			<div className="p-6">
				<Link href="/dashboard" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
						<Sparkles className="h-4 w-4 text-primary-foreground" />
					</div>
					<span className="font-bold text-xl">Hare</span>
					<Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
						Beta
					</Badge>
				</Link>
			</div>

			{/* Workspace Switcher */}
			<div className="px-4 mb-2">
				<WorkspaceSwitcher />
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-4 py-4">
				<div className="space-y-1">
					{routes.map((route) => {
						const active = isActive(route.href)
						return (
							<Link
								key={route.href}
								href={route.href}
								className={cn(
									'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
									active
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
								)}
							>
								<route.icon
									className={cn(
										'h-4 w-4 transition-colors',
										active
											? 'text-primary-foreground'
											: 'text-muted-foreground group-hover:text-sidebar-accent-foreground'
									)}
								/>
								{route.label}
							</Link>
						)
					})}
				</div>
			</nav>

			{/* Footer */}
			<div className="p-4 border-t border-sidebar-border">
				<div className="rounded-lg bg-sidebar-accent/50 p-4">
					<div className="flex items-center gap-2 mb-2">
						<Sparkles className="h-4 w-4 text-primary" />
						<span className="text-sm font-medium">Need help?</span>
					</div>
					<p className="text-xs text-muted-foreground mb-3">
						Check out the documentation or join our community.
					</p>
					<Link
						href="/docs"
						className="text-xs font-medium text-primary hover:underline"
					>
						View Docs →
					</Link>
				</div>
			</div>
		</div>
	)
}
