'use client'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'
import { Activity, Bot, Home, Settings, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WorkspaceSwitcher } from './workspace-switcher'

const routes = [
	{ label: 'Dashboard', icon: Home, href: '/dashboard' },
	{ label: 'Agents', icon: Bot, href: '/dashboard/agents' },
	{ label: 'Tools', icon: Wrench, href: '/dashboard/tools' },
	{ label: 'Usage', icon: Activity, href: '/dashboard/usage' },
	{ label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export function Sidebar() {
	const pathname = usePathname()

	const isActive = (href: string) => {
		if (href === '/dashboard') return pathname === href
		return pathname.startsWith(href)
	}

	return (
		<div className="flex flex-col h-full bg-background border-r">
			{/* Logo */}
			<div className="p-4 border-b">
				<Link href="/dashboard" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
						<Sparkles className="h-4 w-4 text-primary-foreground" />
					</div>
					<span className="font-bold text-lg">Hare</span>
					<Badge variant="secondary" className="text-[10px] px-1.5">
						Beta
					</Badge>
				</Link>
			</div>

			{/* Workspace Switcher */}
			<div className="p-3 border-b">
				<WorkspaceSwitcher />
			</div>

			{/* Navigation */}
			<nav className="flex-1 p-3">
				<div className="space-y-1">
					{routes.map((route) => {
						const active = isActive(route.href)
						return (
							<Link
								key={route.href}
								href={route.href}
								className={cn(
									'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px]',
									active
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
				<Link
					href="/docs"
					className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px]"
				>
					<span>View Docs</span>
				</Link>
			</div>
		</div>
	)
}
