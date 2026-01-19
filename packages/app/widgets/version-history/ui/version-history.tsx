'use client'

import { Badge } from '@hare/ui/components/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@hare/ui/components/card'
import { Skeleton } from '@hare/ui/components/skeleton'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@hare/ui/components/collapsible'
import { ChevronDown, Clock, GitCommit, User, Wrench } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAgentVersionsQuery } from '../../../shared/api'

export interface VersionHistoryProps {
	agentId: string
}

interface VersionDiff {
	model?: { from: string; to: string }
	instructions?: { from: string | null; to: string | null }
	toolIds?: { added: string[]; removed: string[] }
	config?: { from: Record<string, unknown> | null; to: Record<string, unknown> | null }
}

function formatDate(dateString: string): string {
	const date = new Date(dateString)
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function computeDiff(
	current: {
		model: string
		instructions: string | null
		toolIds: string[] | null
		config?: Record<string, unknown> | null
	},
	previous?: {
		model: string
		instructions: string | null
		toolIds: string[] | null
		config?: Record<string, unknown> | null
	},
): VersionDiff | null {
	if (!previous) return null

	const diff: VersionDiff = {}

	if (current.model !== previous.model) {
		diff.model = { from: previous.model, to: current.model }
	}

	if (current.instructions !== previous.instructions) {
		diff.instructions = { from: previous.instructions, to: current.instructions }
	}

	const currentTools = current.toolIds ?? []
	const previousTools = previous.toolIds ?? []
	const addedTools = currentTools.filter((t) => !previousTools.includes(t))
	const removedTools = previousTools.filter((t) => !currentTools.includes(t))
	if (addedTools.length > 0 || removedTools.length > 0) {
		diff.toolIds = { added: addedTools, removed: removedTools }
	}

	const currentConfig = current.config ?? {}
	const previousConfig = previous.config ?? {}
	if (JSON.stringify(currentConfig) !== JSON.stringify(previousConfig)) {
		diff.config = { from: previous.config ?? null, to: current.config ?? null }
	}

	return Object.keys(diff).length > 0 ? diff : null
}

function DiffSummary({ diff }: { diff: VersionDiff | null }) {
	if (!diff) {
		return <span className="text-muted-foreground text-sm">Initial version</span>
	}

	const changes: string[] = []

	if (diff.model) {
		changes.push(`Model: ${diff.model.from} → ${diff.model.to}`)
	}

	if (diff.instructions) {
		const fromLen = diff.instructions.from?.length ?? 0
		const toLen = diff.instructions.to?.length ?? 0
		if (fromLen === 0 && toLen > 0) {
			changes.push('Instructions added')
		} else if (fromLen > 0 && toLen === 0) {
			changes.push('Instructions removed')
		} else {
			changes.push('Instructions modified')
		}
	}

	if (diff.toolIds) {
		if (diff.toolIds.added.length > 0) {
			changes.push(`+${diff.toolIds.added.length} tool${diff.toolIds.added.length > 1 ? 's' : ''}`)
		}
		if (diff.toolIds.removed.length > 0) {
			changes.push(
				`-${diff.toolIds.removed.length} tool${diff.toolIds.removed.length > 1 ? 's' : ''}`,
			)
		}
	}

	if (diff.config) {
		changes.push('Config modified')
	}

	return (
		<div className="flex flex-wrap gap-2">
			{changes.map((change, idx) => (
				<Badge key={idx} variant="secondary" className="text-xs">
					{change}
				</Badge>
			))}
		</div>
	)
}

interface VersionData {
	id: string
	version: number
	model: string
	instructions: string | null
	toolIds: string[] | null
	config?: Record<string, unknown> | null
	createdAt: string
	createdBy: string
}

function VersionCard({
	version,
	previousVersion,
	isLatest,
}: {
	version: VersionData
	previousVersion?: VersionData
	isLatest: boolean
}) {
	const [isOpen, setIsOpen] = useState(false)
	const diff = useMemo(() => computeDiff(version, previousVersion), [version, previousVersion])

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="border rounded-lg hover:border-primary/50 transition-colors">
				<CollapsibleTrigger className="w-full p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2">
								<GitCommit className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium">v{version.version}</span>
							</div>
							{isLatest && (
								<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
									Latest
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<User className="h-3.5 w-3.5" />
								<span className="max-w-[120px] truncate">{version.createdBy}</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Clock className="h-3.5 w-3.5" />
								<span>{formatDate(version.createdAt)}</span>
							</div>
							<ChevronDown
								className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
							/>
						</div>
					</div>
					<div className="mt-2 text-left">
						<DiffSummary diff={diff} />
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="px-4 pb-4 pt-0 border-t space-y-4">
						<div className="grid gap-4 md:grid-cols-2 mt-4">
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Model</h4>
								<p className="text-sm text-muted-foreground">{version.model}</p>
							</div>
							<div className="space-y-2">
								<h4 className="text-sm font-medium flex items-center gap-2">
									<Wrench className="h-4 w-4" />
									Tools
								</h4>
								{version.toolIds && version.toolIds.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{version.toolIds.map((toolId) => (
											<Badge key={toolId} variant="outline" className="text-xs">
												{toolId}
											</Badge>
										))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground">No custom tools</p>
								)}
							</div>
						</div>
						{version.instructions && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Instructions</h4>
								<div className="rounded-md bg-muted p-3 max-h-32 overflow-y-auto">
									<pre className="text-xs whitespace-pre-wrap font-mono">
										{version.instructions}
									</pre>
								</div>
							</div>
						)}
						{version.config && Object.keys(version.config).length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Configuration</h4>
								<div className="rounded-md bg-muted p-3">
									<pre className="text-xs whitespace-pre-wrap font-mono">
										{JSON.stringify(version.config, null, 2)}
									</pre>
								</div>
							</div>
						)}
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	)
}

function LoadingSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2, 3].map((i) => (
				<div key={i} className="border rounded-lg p-4 space-y-3">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-20" />
						<div className="flex items-center gap-4">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-32" />
						</div>
					</div>
					<Skeleton className="h-4 w-48" />
				</div>
			))}
		</div>
	)
}

export function VersionHistory({ agentId }: VersionHistoryProps) {
	const { data, isLoading, error } = useAgentVersionsQuery(agentId)

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Version History</CardTitle>
					<CardDescription>View deployment history and changes</CardDescription>
				</CardHeader>
				<CardContent>
					<LoadingSkeleton />
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Version History</CardTitle>
					<CardDescription>View deployment history and changes</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-destructive">{error.message}</p>
				</CardContent>
			</Card>
		)
	}

	const versions = data?.versions ?? []

	return (
		<Card>
			<CardHeader>
				<CardTitle>Version History</CardTitle>
				<CardDescription>
					{versions.length} version{versions.length !== 1 ? 's' : ''} deployed
				</CardDescription>
			</CardHeader>
			<CardContent>
				{versions.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<GitCommit className="h-8 w-8 text-muted-foreground mb-2" />
						<p className="text-sm text-muted-foreground">No versions yet</p>
						<p className="text-xs text-muted-foreground mt-1">
							Deploy your agent to create the first version
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{versions.map((version, idx) => (
							<VersionCard
								key={version.id}
								version={version}
								previousVersion={versions[idx + 1]}
								isLatest={idx === 0}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
