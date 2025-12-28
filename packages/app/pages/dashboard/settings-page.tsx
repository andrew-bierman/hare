'use client'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { CreditCard, Key, Settings, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useWorkspace } from '../../app/providers/workspace-provider'

export interface SettingsPageProps {
	/** Render prop for navigation links */
	renderLink: (props: { to: string; children: ReactNode; className?: string }) => ReactNode
	/** Route paths configuration */
	routes?: {
		billing: string
		team: string
		apiKeys: string
	}
}

const defaultRoutes = {
	billing: '/dashboard/settings/billing',
	team: '/dashboard/settings/team',
	apiKeys: '/dashboard/settings/api-keys',
}

export function SettingsPage({ renderLink, routes }: SettingsPageProps) {
	const r = routes ?? defaultRoutes
	const { activeWorkspace, isLoading } = useWorkspace()

	const settingsSections = [
		{
			title: 'Billing',
			description: 'Manage your subscription and payment methods',
			icon: CreditCard,
			href: r.billing,
		},
		{
			title: 'Team',
			description: 'Invite team members and manage roles',
			icon: Users,
			href: r.team,
		},
		{
			title: 'API Keys',
			description: 'Create and manage API keys for your workspace',
			icon: Key,
			href: r.apiKeys,
		},
	]

	if (isLoading) {
		return (
			<div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-40 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground text-sm sm:text-base mt-1">
					Manage your workspace settings
				</p>
			</div>

			{/* Workspace Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						Workspace
					</CardTitle>
					<CardDescription>Your current workspace settings</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Name</span>
							<span className="font-medium">{activeWorkspace?.name || 'My Workspace'}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Slug</span>
							<span className="font-mono text-sm">{activeWorkspace?.slug || 'my-workspace'}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Settings Sections */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{settingsSections.map((section) => (
					<div key={section.href}>
						{renderLink({
							to: section.href,
							children: (
								<Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
									<CardHeader>
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
											<section.icon className="h-5 w-5 text-primary" />
										</div>
										<CardTitle className="text-lg">{section.title}</CardTitle>
										<CardDescription>{section.description}</CardDescription>
									</CardHeader>
									<CardContent>
										<Button variant="outline" className="w-full">
											Manage
										</Button>
									</CardContent>
								</Card>
							),
						})}
					</div>
				))}
			</div>
		</div>
	)
}
