'use client'

import { useMemo, useState } from 'react'
import { useToolsQuery } from '../../../shared/api/hooks'
import type { ToolCategory } from './types'
import { getToolCategory as getToolCategoryFromType } from './tool-icons'

// Infer Tool type from API response to ensure type compatibility
type ApiToolsResponse = ReturnType<typeof useToolsQuery>['data']
type Tool = NonNullable<ApiToolsResponse>['tools'][number]

/**
 * Get the category for a tool.
 * Uses the tool type to determine category.
 */
function getToolCategory(tool: Tool): ToolCategory {
	return getToolCategoryFromType(tool.type)
}

/**
 * Category display order (most commonly used first).
 */
const CATEGORY_ORDER: ToolCategory[] = [
	'storage',
	'database',
	'http',
	'ai',
	'utility',
	'search',
	'integrations',
	'data',
	'sandbox',
	'validation',
	'transform',
]

interface UseToolPickerOptions {
	initialSelectedIds: string[]
	maxTools?: number
}

export function useToolPicker({
	initialSelectedIds,
	maxTools = 20,
}: UseToolPickerOptions) {
	const { data: toolsData, isLoading } = useToolsQuery()
	const [selectedToolIds, setSelectedToolIds] = useState<string[]>(initialSelectedIds)
	const [searchQuery, setSearchQuery] = useState('')
	const [activeCategory, setActiveCategory] = useState<ToolCategory>('all')

	const tools = toolsData?.tools ?? []

	const selectedTools = useMemo(() => {
		return selectedToolIds
			.map((id) => tools.find((t) => t.id === id))
			.filter((t): t is Tool => t !== undefined)
	}, [selectedToolIds, tools])

	const filteredTools = useMemo(() => {
		let filtered = tools

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			filtered = filtered.filter(
				(tool) =>
					tool.name.toLowerCase().includes(query) ||
					(tool.description?.toLowerCase() ?? '').includes(query) ||
					tool.type.toLowerCase().includes(query),
			)
		}

		// Filter by category
		if (activeCategory !== 'all') {
			filtered = filtered.filter((tool) => getToolCategory(tool) === activeCategory)
		}

		return filtered
	}, [tools, searchQuery, activeCategory])

	const toolCounts = useMemo(() => {
		const counts: Record<ToolCategory, number> = {
			all: tools.length,
			storage: 0,
			database: 0,
			http: 0,
			search: 0,
			ai: 0,
			utility: 0,
			integrations: 0,
			data: 0,
			sandbox: 0,
			validation: 0,
			transform: 0,
		}

		tools.forEach((tool) => {
			const category = getToolCategory(tool)
			counts[category]++
		})

		return counts
	}, [tools])

	/**
	 * Tools grouped by category for accordion display.
	 * Filters by search query but ignores category filter (accordion shows all categories).
	 */
	const groupedTools = useMemo(() => {
		let toolsToGroup = tools

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			toolsToGroup = toolsToGroup.filter(
				(tool) =>
					tool.name.toLowerCase().includes(query) ||
					(tool.description?.toLowerCase() ?? '').includes(query) ||
					tool.type.toLowerCase().includes(query),
			)
		}

		// Group by category
		const groups: Record<ToolCategory, Tool[]> = {
			all: [],
			storage: [],
			database: [],
			http: [],
			search: [],
			ai: [],
			utility: [],
			integrations: [],
			data: [],
			sandbox: [],
			validation: [],
			transform: [],
		}

		toolsToGroup.forEach((tool) => {
			const category = getToolCategory(tool)
			groups[category].push(tool)
		})

		// Return as ordered array of { category, tools } objects
		return CATEGORY_ORDER.map((category) => ({
			category,
			tools: groups[category],
		})).filter((group) => group.tools.length > 0)
	}, [tools, searchQuery])

	const isAtMaxTools = selectedToolIds.length >= maxTools

	const toggleTool = (toolId: string) => {
		setSelectedToolIds((prev) => {
			if (prev.includes(toolId)) {
				return prev.filter((id) => id !== toolId)
			}
			if (prev.length >= maxTools) {
				return prev
			}
			return [...prev, toolId]
		})
	}

	const reorderTools = (toolIds: string[]) => {
		setSelectedToolIds(toolIds)
	}

	const removeTool = (toolId: string) => {
		setSelectedToolIds((prev) => prev.filter((id) => id !== toolId))
	}

	const clearSelection = () => {
		setSelectedToolIds([])
	}

	return {
		// Data
		tools,
		selectedTools,
		filteredTools,
		groupedTools,
		isLoading,
		selectedToolIds,

		// State
		searchQuery,
		activeCategory,

		// Actions
		setSearchQuery,
		setActiveCategory,
		toggleTool,
		reorderTools,
		removeTool,
		clearSelection,

		// Derived
		isAtMaxTools,
		toolCounts,
	}
}
