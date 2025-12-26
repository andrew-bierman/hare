'use client'

import { useMemo, useState } from 'react'
import { type Tool, useTools } from 'web-app/lib/api/hooks'
import type { ToolCategory } from './types'

const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
	// Storage
	kv: 'storage',
	r2: 'storage',
	// Database
	sql: 'database',
	// HTTP
	http: 'http',
	// Search
	vectorize: 'search',
	// AI
	sentiment: 'ai',
	summarize: 'ai',
	translate: 'ai',
	image_generate: 'ai',
	classify: 'ai',
	ner: 'ai',
	embedding: 'ai',
	qa: 'ai',
	// Utility
	datetime: 'utility',
	json: 'utility',
	text: 'utility',
	math: 'utility',
	uuid: 'utility',
	hash: 'utility',
	base64: 'utility',
	url: 'utility',
	delay: 'utility',
	// Integrations
	zapier: 'integrations',
	webhook: 'integrations',
	// Data
	rss: 'data',
	scrape: 'data',
	regex: 'data',
	crypto: 'data',
	json_schema: 'data',
	csv: 'data',
	template: 'data',
	// Sandbox
	code_execute: 'sandbox',
	code_validate: 'sandbox',
	sandbox_file: 'sandbox',
	// Validation
	email: 'validation',
	phone: 'validation',
	credit_card: 'validation',
	ip: 'validation',
	// Transform
	markdown: 'transform',
	diff: 'transform',
	qrcode: 'transform',
	compression: 'transform',
	color: 'transform',
}

function getToolCategory(tool: Tool): ToolCategory {
	// Try to match by type first
	if (TOOL_CATEGORY_MAP[tool.type]) {
		return TOOL_CATEGORY_MAP[tool.type]
	}

	// Try to match by name (lowercase, remove spaces/dashes)
	const normalizedName = tool.name.toLowerCase().replace(/[\s-]/g, '_')
	if (TOOL_CATEGORY_MAP[normalizedName]) {
		return TOOL_CATEGORY_MAP[normalizedName]
	}

	// Default to utility for custom tools
	return 'utility'
}

interface UseToolPickerOptions {
	workspaceId: string
	initialSelectedIds: string[]
	maxTools?: number
}

export function useToolPicker({
	workspaceId,
	initialSelectedIds,
	maxTools = 20,
}: UseToolPickerOptions) {
	const { data: toolsData, isLoading } = useTools(workspaceId)
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
					tool.description.toLowerCase().includes(query) ||
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
