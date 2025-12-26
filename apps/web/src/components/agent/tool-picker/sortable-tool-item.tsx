'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import type { SortableToolItemProps } from './types'

export function SortableToolItem({ tool, onRemove }: SortableToolItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: tool.id,
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-sm',
				isDragging && 'z-50 scale-105 shadow-lg ring-2 ring-primary'
			)}
		>
			<button
				type="button"
				className="cursor-grab touch-none active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4 text-muted-foreground" />
			</button>
			<span className="flex-1 truncate text-sm font-medium">{tool.name}</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
				onClick={() => onRemove(tool.id)}
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	)
}
