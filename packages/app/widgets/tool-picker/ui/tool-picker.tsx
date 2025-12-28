'use client'

import { Button } from '@hare/ui/components/button'
import { Skeleton } from '@hare/ui/components/skeleton'
import { useEffect } from 'react'
import { SelectedTools } from './selected-tools'
import { ToolCard } from './tool-card'
import { ToolCategories } from './tool-categories'
import { ToolSearch } from './tool-search'
import type { Tool } from '../../../shared/api/types'
import type { ToolPickerProps } from './types'
import { useToolPicker } from './use-tool-picker'

export function ToolPicker({
	workspaceId,
	selectedToolIds,
	onSelectionChange,
	maxTools = 20,
}: ToolPickerProps) {
	const {
		selectedTools,
		filteredTools,
		isLoading,
		selectedToolIds: internalSelectedIds,
		searchQuery,
		activeCategory,
		setSearchQuery,
		setActiveCategory,
		toggleTool,
		reorderTools,
		removeTool,
		clearSelection,
		isAtMaxTools,
		toolCounts,
	} = useToolPicker({
		workspaceId,
		initialSelectedIds: selectedToolIds,
		maxTools,
	})

	// Sync internal state with external prop
	useEffect(() => {
		onSelectionChange(internalSelectedIds)
	}, [internalSelectedIds, onSelectionChange])

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-9 w-16" />
					</div>
					<Skeleton className="h-20 w-full" />
				</div>
				<Skeleton className="h-10 w-full" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{['tp-sk-1', 'tp-sk-2', 'tp-sk-3', 'tp-sk-4', 'tp-sk-5', 'tp-sk-6'].map((id) => (
						<Skeleton key={id} className="h-32" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Selected Tools Section */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium">
						Selected Tools ({internalSelectedIds.length}/{maxTools})
					</h3>
					{internalSelectedIds.length > 0 && (
						<Button variant="ghost" size="sm" onClick={clearSelection}>
							Clear All
						</Button>
					)}
				</div>
				<SelectedTools tools={selectedTools} onRemove={removeTool} onReorder={reorderTools} />
			</div>

			{/* Search and Filter Section */}
			<div className="space-y-4">
				<ToolSearch value={searchQuery} onChange={setSearchQuery} />
				<ToolCategories
					activeCategory={activeCategory}
					onCategoryChange={setActiveCategory}
					toolCounts={toolCounts}
				/>
			</div>

			{/* Available Tools Grid */}
			<div>
				{filteredTools.length === 0 ? (
					<div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
						<p className="text-sm text-muted-foreground">
							{searchQuery || activeCategory !== 'all'
								? 'No tools match your search criteria.'
								: 'No tools available.'}
						</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{filteredTools.map((tool: Tool) => {
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
				)}
			</div>
		</div>
	)
}
