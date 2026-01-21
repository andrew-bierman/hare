'use client'

import { useState, useEffect, useMemo } from 'react'
import Fuse from 'fuse.js'
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@hare/ui/components/command'
import {
	Bot,
	FileCode,
	LayoutDashboard,
	Plus,
	Settings,
	Wrench,
	BarChart3,
	Activity,
	Key,
	CreditCard,
	Users,
} from 'lucide-react'
import { useAgentsQuery, useToolsQuery } from '../../../shared/api'

interface CommandSearchProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onNavigate?: (path: string) => void
}

interface SearchItem {
	id: string
	type: 'action' | 'page' | 'agent' | 'tool'
	title: string
	description?: string
	path: string
}

// Static navigation items
const PAGES: SearchItem[] = [
	{ id: 'dashboard', type: 'page', title: 'Dashboard', description: 'Overview', path: '/dashboard' },
	{ id: 'agents', type: 'page', title: 'Agents', description: 'Manage agents', path: '/dashboard/agents' },
	{ id: 'tools', type: 'page', title: 'Tools', description: 'Configure tools', path: '/dashboard/tools' },
	{ id: 'analytics', type: 'page', title: 'Analytics', path: '/dashboard/analytics' },
	{ id: 'usage', type: 'page', title: 'Usage', path: '/dashboard/usage' },
	{ id: 'settings', type: 'page', title: 'Settings', path: '/dashboard/settings' },
	{ id: 'api-keys', type: 'page', title: 'API Keys', path: '/dashboard/settings/api-keys' },
	{ id: 'billing', type: 'page', title: 'Billing', path: '/dashboard/settings/billing' },
	{ id: 'team', type: 'page', title: 'Team', path: '/dashboard/settings/team' },
]

const ACTIONS: SearchItem[] = [
	{ id: 'new-agent', type: 'action', title: 'Create new agent', description: 'Build an AI agent', path: '/dashboard/agents/new' },
]

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	dashboard: LayoutDashboard,
	agents: Bot,
	tools: Wrench,
	analytics: BarChart3,
	usage: Activity,
	settings: Settings,
	'api-keys': Key,
	billing: CreditCard,
	team: Users,
}

export function CommandSearch({ open, onOpenChange, onNavigate }: CommandSearchProps) {
	const [query, setQuery] = useState('')

	const { data: agentsData } = useAgentsQuery()
	const { data: toolsData } = useToolsQuery()

	// Build searchable items
	const allItems = useMemo(() => {
		const items: SearchItem[] = [...ACTIONS, ...PAGES]

		// Add agents
		agentsData?.agents?.forEach((agent) => {
			items.push({
				id: `agent-${agent.id}`,
				type: 'agent',
				title: agent.name,
				description: agent.description || agent.model,
				path: `/dashboard/agents/${agent.id}`,
			})
		})

		// Add custom tools (non-system tools)
		toolsData?.tools?.filter((t) => !t.isSystem).forEach((tool) => {
			items.push({
				id: `tool-${tool.id}`,
				type: 'tool',
				title: tool.name,
				description: tool.description ?? undefined,
				path: `/dashboard/tools/${tool.id}`,
			})
		})

		return items
	}, [agentsData, toolsData])

	// Fuse search
	const fuse = useMemo(
		() => new Fuse(allItems, { keys: ['title', 'description'], threshold: 0.4 }),
		[allItems],
	)

	const results = useMemo(() => {
		if (!query.trim()) {
			return { actions: ACTIONS, pages: PAGES.slice(0, 4), agents: [], tools: [] }
		}
		const items = fuse.search(query).map((r) => r.item)
		return {
			actions: items.filter((i) => i.type === 'action'),
			pages: items.filter((i) => i.type === 'page'),
			agents: items.filter((i) => i.type === 'agent'),
			tools: items.filter((i) => i.type === 'tool'),
		}
	}, [query, fuse])

	useEffect(() => {
		if (!open) setQuery('')
	}, [open])

	const handleSelect = (path: string) => {
		onOpenChange(false)
		onNavigate?.(path)
	}

	const getIcon = (item: SearchItem) => {
		if (item.type === 'agent') return <Bot className="mr-2 h-4 w-4 shrink-0" />
		if (item.type === 'tool') return <FileCode className="mr-2 h-4 w-4 shrink-0" />
		if (item.type === 'action') return <Plus className="mr-2 h-4 w-4 shrink-0" />
		const Icon = PAGE_ICONS[item.id] || LayoutDashboard
		return <Icon className="mr-2 h-4 w-4 shrink-0" />
	}

	const hasResults = results.actions.length + results.pages.length + results.agents.length + results.tools.length > 0

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
			<CommandList>
				{!hasResults && query && <CommandEmpty>No results found.</CommandEmpty>}

				{results.actions.length > 0 && (
					<CommandGroup heading="Actions">
						{results.actions.map((item) => (
							<CommandItem key={item.id} onSelect={() => handleSelect(item.path)}>
								{getIcon(item)}
								<span>{item.title}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{results.agents.length > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Agents">
							{results.agents.map((item) => (
								<CommandItem key={item.id} onSelect={() => handleSelect(item.path)}>
									{getIcon(item)}
									<span>{item.title}</span>
									{item.description && (
										<span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}

				{results.tools.length > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Tools">
							{results.tools.map((item) => (
								<CommandItem key={item.id} onSelect={() => handleSelect(item.path)}>
									{getIcon(item)}
									<span>{item.title}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}

				{results.pages.length > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Pages">
							{results.pages.map((item) => (
								<CommandItem key={item.id} onSelect={() => handleSelect(item.path)}>
									{getIcon(item)}
									<span>{item.title}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}
			</CommandList>
		</CommandDialog>
	)
}
