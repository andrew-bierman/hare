'use client'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'
import { Check } from 'lucide-react'
import type { ToolCardProps } from './types'

const TOOL_TYPE_ICONS: Record<string, string> = {
	http: '🌐',
	sql: '🗄️',
	kv: '📦',
	r2: '☁️',
	vectorize: '🔍',
	custom: '🔧',
}

export function ToolCard({ tool, isSelected, isDisabled, onToggle }: ToolCardProps) {
	const icon = TOOL_TYPE_ICONS[tool.type] || '🔧'

	return (
		<button
			type="button"
			className={cn(
				'group relative w-full cursor-pointer rounded-lg border p-4 text-left transition-all duration-200',
				'hover:border-primary/50 hover:bg-accent/50',
				isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
				isDisabled && !isSelected && 'cursor-not-allowed opacity-50',
			)}
			onClick={() => !isDisabled && onToggle()}
			aria-pressed={isSelected}
			disabled={isDisabled && !isSelected}
		>
			{/* Selection indicator */}
			{isSelected && (
				<div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
					<Check className="h-4 w-4" />
				</div>
			)}

			<div className="flex items-start gap-3">
				{/* Icon */}
				<div className="text-2xl">{icon}</div>

				{/* Content */}
				<div className="flex-1 space-y-1">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold leading-none">{tool.name}</h3>
						{tool.isSystem && (
							<Badge variant="secondary" className="text-xs">
								System
							</Badge>
						)}
					</div>
					<p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
					<div className="flex items-center gap-2 pt-1">
						<Badge variant="outline" className="text-xs">
							{tool.type}
						</Badge>
					</div>
				</div>
			</div>
		</button>
	)
}
