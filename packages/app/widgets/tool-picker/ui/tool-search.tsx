'use client'

import { SearchInput } from '@hare/ui/components/search-input'
import type { ToolSearchProps } from './types'

export function ToolSearch({ value, onChange, placeholder = 'Search tools...' }: ToolSearchProps) {
	return (
		<SearchInput
			placeholder={placeholder}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	)
}
