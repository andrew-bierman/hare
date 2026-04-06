'use client'

import type { AgentTemplate } from '@hare/config'
import { Badge } from '@hare/ui/components/badge'
import { Card, CardContent } from '@hare/ui/components/card'
import { cn } from '@hare/ui/lib/utils'
import {
	BookOpen,
	Headphones,
	type LucideIcon,
	Plus,
	Sparkles,
	TrendingUp,
	Wand2,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
	Headphones,
	BookOpen,
	TrendingUp,
	Sparkles,
	Wand2,
	Plus,
}

export interface TemplateCardProps {
	template: AgentTemplate
	onClick: () => void
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
	const Icon = ICON_MAP[template.icon] || Sparkles

	return (
		<Card
			className={cn(
				'group cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
			)}
			onClick={onClick}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onClick()
				}
			}}
			role="button"
			aria-label={`Use ${template.name} template`}
		>
			<CardContent className="p-6">
				<div className="flex items-start gap-4">
					{/* Icon */}
					<div
						className={cn(
							'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
							template.color,
							'text-white shadow-sm',
						)}
					>
						<Icon className="h-6 w-6" />
					</div>

					{/* Content */}
					<div className="min-w-0 flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-base group-hover:text-primary transition-colors">
								{template.name}
							</h3>
							<Badge variant="secondary" className="text-xs capitalize">
								{template.responseStyle}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
						{template.suggestedToolTypes.length > 0 && (
							<div className="flex gap-1 pt-1">
								{template.suggestedToolTypes.slice(0, 3).map((toolType) => (
									<Badge key={toolType} variant="outline" className="text-xs">
										{toolType}
									</Badge>
								))}
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export interface ScratchCardProps {
	onClick: () => void
}

export function ScratchCard({ onClick }: ScratchCardProps) {
	return (
		<Card
			className={cn(
				'group cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
				'border-dashed',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
			)}
			onClick={onClick}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onClick()
				}
			}}
			role="button"
			aria-label="Start from scratch"
		>
			<CardContent className="p-6">
				<div className="flex items-center gap-4">
					{/* Icon */}
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors">
						<Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
					</div>

					{/* Content */}
					<div className="space-y-1">
						<h3 className="font-semibold text-base group-hover:text-primary transition-colors">
							Start from scratch
						</h3>
						<p className="text-sm text-muted-foreground">
							Create a custom agent with your own configuration
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
