'use client'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'
import { Activity, BarChart3, Bot, Home, Rabbit, Settings, Wrench } from 'lucide-react'
import { APP_CONFIG, DASHBOARD_CONTENT, FEATURES, NAV_ITEMS } from '@shared/config'

const ICONS = { Home, Bot, Wrench, Activity, Settings, BarChart3 } as const

export interface SidebarProps {
	pathname: string
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	WorkspaceSwitcher?: React.ComponentType
}

/**
 * Sidebar widget for dashboard navigation.
 *
 * @param pathname - Current pathname for active state
 * @param Link - Router Link component
 * @param WorkspaceSwitcher - Optional workspace switcher component
 */
export function Sidebar({ pathname, Link, WorkspaceSwitcher }: SidebarProps) {
	const routes = NAV_ITEMS.dashboard.map((item) => ({
		label: item.label,
		icon: ICONS[item.icon as keyof typeof ICONS],
		href: item.href,
	}))

	const isActive = (href: string) => {
		if (href === '/dashboard') return pathname === href
		return pathname.startsWith(href)
	}

	return (
		<div className="flex flex-col h-full bg-background border-r">
			{/* Logo */}
			<div className="p-4 border-b">
				<Link to="/dashboard" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
						<Rabbit className="h-5 w-5 text-white" />
					</div>
					<span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
						{APP_CONFIG.name}
					</span>
					{FEATURES.showBetaBadge && (
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
						>
							{APP_CONFIG.stage}
						</Badge>
					)}
				</Link>
			</div>

			{/* Workspace Switcher */}
			{WorkspaceSwitcher && (
				<div className="p-3 border-b">
					<WorkspaceSwitcher />
				</div>
			)}

			{/* Navigation */}
			<nav className="flex-1 p-3">
				<div className="space-y-1">
					{routes.map((route) => {
						const active = isActive(route.href)
						return (
							<Link
								key={route.href}
								to={route.href}
								className={cn(
									'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors',
									active
										? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
										: 'text-muted-foreground hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/50 dark:hover:text-orange-400',
								)}
							>
								<route.icon className="h-5 w-5 flex-shrink-0" />
								{route.label}
							</Link>
						)
					})}
				</div>
			</nav>

			{/* Help */}
			<div className="p-3 border-t">
				<a
					href={APP_CONFIG.docs}
					className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px]"
				>
					<span>{DASHBOARD_CONTENT.sidebar.docsLink}</span>
				</a>
			</div>
		</div>
	)
}
