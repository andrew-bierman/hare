'use client'

import { Bot, Home, Settings, TrendingUp, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@workspace/ui/lib/utils'
import { WorkspaceSwitcher } from './workspace-switcher'

const routes = [
	{
		label: 'Dashboard',
		icon: Home,
		href: '/dashboard',
		color: 'text-zinc-500',
	},
	{
		label: 'Agents',
		icon: Bot,
		href: '/dashboard/agents',
		color: 'text-violet-500',
	},
	{
		label: 'Tools',
		icon: Wrench,
		href: '/dashboard/tools',
		color: 'text-pink-700',
	},
	{
		label: 'Usage',
		icon: TrendingUp,
		href: '/dashboard/usage',
		color: 'text-emerald-500',
	},
	{
		label: 'Settings',
		icon: Settings,
		href: '/dashboard/settings',
		color: 'text-zinc-500',
	},
]

export function Sidebar() {
	const pathname = usePathname()

	return (
		<div className="space-y-4 py-4 flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
			<div className="px-3 py-2 flex-1">
				<Link href="/dashboard" className="flex items-center pl-3 mb-6">
					<h1 className="text-2xl font-bold">Hare</h1>
				</Link>
				<div className="mb-4 px-3">
					<WorkspaceSwitcher />
				</div>
				<div className="space-y-1">
					{routes.map((route) => (
						<Link
							key={route.href}
							href={route.href}
							className={cn(
								'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition',
								pathname === route.href
									? 'bg-sidebar-accent text-sidebar-accent-foreground'
									: 'text-sidebar-foreground',
							)}
						>
							<div className="flex items-center flex-1">
								<route.icon className={cn('h-5 w-5 mr-3', route.color)} />
								{route.label}
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}
