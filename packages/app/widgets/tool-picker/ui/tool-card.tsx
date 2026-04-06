'use client'

import { Badge } from '@hare/ui/components/badge'
import { Checkbox } from '@hare/ui/components/checkbox'
import { cn } from '@hare/ui/lib/utils'
import { getToolIcon, getToolTypeLabel } from './tool-icons'
import type { ToolCardProps } from './types'

export function ToolCard({ tool, isSelected, isDisabled, onToggle }: ToolCardProps) {
	const Icon = getToolIcon(tool.type)

	return (
		<button
			type="button"
			className={cn(
				'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
				'hover:bg-accent/50',
				isSelected && 'bg-accent',
				isDisabled && !isSelected && 'cursor-not-allowed opacity-50',
			)}
			onClick={() => !isDisabled && onToggle()}
			aria-pressed={isSelected}
			disabled={isDisabled && !isSelected}
		>
			{/* Checkbox */}
			<Checkbox checked={isSelected} className="pointer-events-none" aria-hidden />

			{/* Icon */}
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-sm">{tool.name}</span>
					{tool.isSystem && (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground shrink-0"
						>
							Built-in
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground">{getToolTypeLabel(tool.type)}</span>
					{tool.description && (
						<>
							<span className="text-muted-foreground">·</span>
							<p className="truncate text-xs text-muted-foreground">{tool.description}</p>
						</>
					)}
				</div>
			</div>
		</button>
	)
}
