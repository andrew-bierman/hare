'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Code,
	Loader2,
	Wrench,
	XCircle,
} from 'lucide-react'
import { useState } from 'react'
import type { ToolCallData } from '../../../shared/api/hooks'

export interface ToolCallBlockProps {
	toolCall: ToolCallData
}

// Tool category colors
const TOOL_CATEGORIES: Record<string, { color: string; icon: string }> = {
	http: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: 'globe' },
	sql: { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: 'database' },
	kv: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: 'key' },
	r2: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: 'cloud' },
	ai: { color: 'bg-pink-500/10 text-pink-600 border-pink-500/20', icon: 'sparkles' },
	vectorize: { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: 'database' },
	custom: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: 'wrench' },
	default: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: 'wrench' },
}

function getToolCategory(toolName: string): string {
	const lowerName = toolName.toLowerCase()
	if (lowerName.includes('http') || lowerName.includes('fetch') || lowerName.includes('request')) {
		return 'http'
	}
	if (lowerName.includes('sql') || lowerName.includes('database') || lowerName.includes('query')) {
		return 'sql'
	}
	if (lowerName.includes('kv') || lowerName.includes('cache')) {
		return 'kv'
	}
	if (lowerName.includes('r2') || lowerName.includes('storage') || lowerName.includes('bucket')) {
		return 'r2'
	}
	if (lowerName.includes('ai') || lowerName.includes('model') || lowerName.includes('embeddings')) {
		return 'ai'
	}
	if (lowerName.includes('vector')) {
		return 'vectorize'
	}
	return 'custom'
}

function StatusIcon({ status }: { status: ToolCallData['status'] }) {
	switch (status) {
		case 'pending':
			return <Clock className="h-4 w-4 text-muted-foreground" />
		case 'running':
			return <Loader2 className="h-4 w-4 text-primary animate-spin" />
		case 'completed':
			return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
		case 'error':
			return <XCircle className="h-4 w-4 text-destructive" />
	}
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
	const [isOpen, setIsOpen] = useState(false)
	const category = getToolCategory(toolCall.name)
	const defaultStyle = { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: 'wrench' }
	const categoryStyle = TOOL_CATEGORIES[category] ?? defaultStyle

	const duration =
		toolCall.completedAt && toolCall.startedAt
			? new Date(toolCall.completedAt).getTime() - new Date(toolCall.startedAt).getTime()
			: null

	return (
		<Card className="my-3 border-l-4 border-l-primary/50">
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
						<Button variant="ghost" size="icon" className="h-6 w-6 p-0">
							{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						</Button>

						<div className="flex items-center gap-2 flex-1">
							<Wrench className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium text-sm">{toolCall.name}</span>
							<Badge variant="outline" className={categoryStyle.color}>
								{category}
							</Badge>
						</div>

						<div className="flex items-center gap-2">
							{duration !== null && (
								<span className="text-xs text-muted-foreground">{duration}ms</span>
							)}
							<StatusIcon status={toolCall.status} />
						</div>
					</div>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<CardContent className="pt-0 pb-3 space-y-3">
						{/* Input Parameters */}
						<div>
							<div className="flex items-center gap-2 mb-2">
								<Code className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Input
								</span>
							</div>
							<pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[150px]">
								<code>{JSON.stringify(toolCall.args, null, 2)}</code>
							</pre>
						</div>

						{/* Loading State */}
						{toolCall.status === 'running' && (
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						)}

						{/* Result */}
						{toolCall.status === 'completed' && toolCall.result !== undefined && (
							<div>
								<div className="flex items-center gap-2 mb-2">
									<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
									<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Result
									</span>
								</div>
								<pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[200px]">
									<code>{JSON.stringify(toolCall.result, null, 2)}</code>
								</pre>
							</div>
						)}

						{/* Error */}
						{toolCall.status === 'error' && (
							<div>
								<div className="flex items-center gap-2 mb-2">
									<XCircle className="h-3.5 w-3.5 text-destructive" />
									<span className="text-xs font-medium text-destructive uppercase tracking-wider">
										Error
									</span>
								</div>
								<div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
									{toolCall.error || 'Unknown error occurred'}
								</div>
							</div>
						)}
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	)
}
