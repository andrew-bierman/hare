'use client'

import { Input } from '@hare/ui/components/input'
import { SearchIcon } from 'lucide-react'
import type { ToolSearchProps } from './types'

export function ToolSearch({ value, onChange, placeholder = 'Search tools...' }: ToolSearchProps) {
	return (
		<div className="relative">
			<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="pl-9"
			/>
		</div>
	)
}
