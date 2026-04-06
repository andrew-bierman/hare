import type { useToolsQuery } from '../../../shared/api/hooks'

// Infer Tool type from API response to ensure type compatibility
// This is internal to avoid conflicts with @hare/types Tool export
type ApiToolsResponse = ReturnType<typeof useToolsQuery>['data']
type Tool = NonNullable<ApiToolsResponse>['tools'][number]

export type ToolCategory =
	| 'all'
	| 'storage'
	| 'database'
	| 'http'
	| 'search'
	| 'ai'
	| 'utility'
	| 'integrations'
	| 'data'
	| 'sandbox'
	| 'validation'
	| 'transform'

export interface ToolCategoryInfo {
	id: ToolCategory
	label: string
	icon: string
}

export interface ToolPickerProps {
	selectedToolIds: string[]
	onSelectionChange: (toolIds: string[]) => void
	maxTools?: number
}

export interface ToolCardProps {
	tool: Tool
	isSelected: boolean
	isDisabled: boolean
	onToggle: () => void
}

export interface SelectedToolsProps {
	tools: Tool[]
	onRemove: (toolId: string) => void
	onReorder: (toolIds: string[]) => void
}

export interface SortableToolItemProps {
	tool: Tool
	onRemove: (toolId: string) => void
}

export interface ToolSearchProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}

export interface ToolCategoriesProps {
	activeCategory: ToolCategory
	onCategoryChange: (category: ToolCategory) => void
	toolCounts: Record<ToolCategory, number>
}
