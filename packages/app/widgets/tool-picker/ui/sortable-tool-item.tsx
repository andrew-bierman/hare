'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@hare/ui/lib/utils'
import { GripVertical, X } from 'lucide-react'
import type { SortableToolItemProps } from './types'
import { getToolIcon } from './tool-icons'

export function SortableToolItem({ tool, onRemove }: SortableToolItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: tool.id,
	})
	const Icon = getToolIcon(tool.type)

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'group flex items-center gap-1.5 rounded-full border bg-muted/50 pl-1.5 pr-1 py-0.5 text-xs',
				isDragging && 'z-50 scale-105 shadow-md ring-2 ring-primary',
			)}
		>
			<button
				type="button"
				className="cursor-grab touch-none active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-3 w-3 text-muted-foreground" />
			</button>
			<Icon className="h-3 w-3 text-muted-foreground" />
			<span className="max-w-[100px] truncate font-medium">{tool.name}</span>
			<button
				type="button"
				className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-destructive/20 hover:text-destructive"
				onClick={() => onRemove(tool.id)}
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	)
}
