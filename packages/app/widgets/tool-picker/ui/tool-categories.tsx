'use client'

import { Button } from '@hare/ui/components/button'
import { cn } from '@hare/ui/lib/utils'
import {
	Brain,
	CheckCircle,
	Code,
	Database,
	FileCode,
	Globe,
	HardDrive,
	Layers,
	Plug,
	RefreshCw,
	Search,
	Wrench,
} from 'lucide-react'
import type { ToolCategoriesProps, ToolCategoryInfo } from './types'

const CATEGORIES: ToolCategoryInfo[] = [
	{ id: 'all', label: 'All Tools', icon: 'Layers' },
	{ id: 'storage', label: 'Storage', icon: 'HardDrive' },
	{ id: 'database', label: 'Database', icon: 'Database' },
	{ id: 'http', label: 'HTTP', icon: 'Globe' },
	{ id: 'search', label: 'Search', icon: 'Search' },
	{ id: 'ai', label: 'AI', icon: 'Brain' },
	{ id: 'utility', label: 'Utility', icon: 'Wrench' },
	{ id: 'integrations', label: 'Integrations', icon: 'Plug' },
	{ id: 'data', label: 'Data', icon: 'FileCode' },
	{ id: 'sandbox', label: 'Sandbox', icon: 'Code' },
	{ id: 'validation', label: 'Validation', icon: 'CheckCircle' },
	{ id: 'transform', label: 'Transform', icon: 'RefreshCw' },
]

const ICON_MAP = {
	Layers,
	HardDrive,
	Database,
	Globe,
	Search,
	Brain,
	Wrench,
	Plug,
	FileCode,
	Code,
	CheckCircle,
	RefreshCw,
}

export function ToolCategories({
	activeCategory,
	onCategoryChange,
	toolCounts,
}: ToolCategoriesProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{CATEGORIES.map((category) => {
				const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP]
				const count = toolCounts[category.id] || 0
				const isActive = activeCategory === category.id

				return (
					<Button
						key={category.id}
						variant={isActive ? 'default' : 'outline'}
						size="sm"
						onClick={() => onCategoryChange(category.id)}
						className={cn('gap-2', !isActive && 'hover:bg-accent')}
					>
						{IconComponent && <IconComponent className="h-4 w-4" />}
						<span>{category.label}</span>
						<span
							className={cn(
								'ml-1 rounded-full px-2 py-0.5 text-xs',
								isActive
									? 'bg-primary-foreground/20 text-primary-foreground'
									: 'bg-muted text-muted-foreground',
							)}
						>
							{count}
						</span>
					</Button>
				)
			})}
		</div>
	)
}
