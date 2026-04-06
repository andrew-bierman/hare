'use client'

import { Button } from '@hare/ui/components/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@hare/ui/components/collapsible'
import { Skeleton } from '@hare/ui/components/skeleton'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SelectedTools } from './selected-tools'
import { ToolCard } from './tool-card'
import { getCategoryIcon, TOOL_CATEGORY_LABELS } from './tool-icons'
import { ToolSearch } from './tool-search'
import type { ToolCategory, ToolPickerProps } from './types'
import { useToolPicker } from './use-tool-picker'

export function ToolPicker({ selectedToolIds, onSelectionChange, maxTools = 20 }: ToolPickerProps) {
	const {
		selectedTools,
		groupedTools,
		isLoading,
		selectedToolIds: internalSelectedIds,
		searchQuery,
		setSearchQuery,
		toggleTool,
		reorderTools,
		removeTool,
		clearSelection,
		isAtMaxTools,
	} = useToolPicker({
		initialSelectedIds: selectedToolIds,
		maxTools,
	})

	// Track which categories are expanded
	const [expandedCategories, setExpandedCategories] = useState<Set<ToolCategory>>(
		new Set(['storage', 'ai', 'http']),
	)

	const toggleCategory = (category: ToolCategory) => {
		setExpandedCategories((prev) => {
			const next = new Set(prev)
			if (next.has(category)) {
				next.delete(category)
			} else {
				next.add(category)
			}
			return next
		})
	}

	// Sync internal state with external prop
	useEffect(() => {
		onSelectionChange(internalSelectedIds)
	}, [internalSelectedIds, onSelectionChange])

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<div className="space-y-2">
					{['tp-sk-1', 'tp-sk-2', 'tp-sk-3'].map((id) => (
						<Skeleton key={id} className="h-12 w-full" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Search */}
			<ToolSearch value={searchQuery} onChange={setSearchQuery} />

			{/* Selected Tools */}
			{internalSelectedIds.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-muted-foreground">
							Selected ({internalSelectedIds.length}/{maxTools})
						</span>
						<Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearSelection}>
							Clear
						</Button>
					</div>
					<SelectedTools tools={selectedTools} onRemove={removeTool} onReorder={reorderTools} />
				</div>
			)}

			{/* Tool Categories Accordion */}
			<div className="space-y-1">
				{groupedTools.length === 0 ? (
					<div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed">
						<p className="text-sm text-muted-foreground">
							{searchQuery ? 'No tools match your search.' : 'No tools available.'}
						</p>
					</div>
				) : (
					groupedTools.map(({ category, tools }) => {
						const isExpanded = expandedCategories.has(category)
						const CategoryIcon = getCategoryIcon(category)

						return (
							<Collapsible
								key={category}
								open={isExpanded}
								onOpenChange={() => toggleCategory(category)}
							>
								<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
									<div className="flex items-center gap-2">
										<CategoryIcon className="h-4 w-4 text-muted-foreground" />
										<span>{TOOL_CATEGORY_LABELS[category]}</span>
										<span className="text-xs text-muted-foreground">({tools.length})</span>
									</div>
									<ChevronDown
										className={`h-4 w-4 text-muted-foreground transition-transform ${
											isExpanded ? 'rotate-180' : ''
										}`}
									/>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<div className="ml-2 border-l pl-2 py-1 space-y-0.5">
										{tools.map((tool) => {
											const isSelected = internalSelectedIds.includes(tool.id)
											const isDisabled = !isSelected && isAtMaxTools

											return (
												<ToolCard
													key={tool.id}
													tool={tool}
													isSelected={isSelected}
													isDisabled={isDisabled}
													onToggle={() => toggleTool(tool.id)}
												/>
											)
										})}
									</div>
								</CollapsibleContent>
							</Collapsible>
						)
					})
				)}
			</div>
		</div>
	)
}
