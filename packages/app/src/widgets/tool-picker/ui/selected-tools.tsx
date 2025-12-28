'use client'

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import type { Tool } from '../../../shared/api'
import { SortableToolItem } from './sortable-tool-item'
import type { SelectedToolsProps } from './types'

export function SelectedTools({ tools, onRemove, onReorder }: SelectedToolsProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event

		if (over && active.id !== over.id) {
			const oldIndex = tools.findIndex((tool: Tool) => tool.id === active.id)
			const newIndex = tools.findIndex((tool: Tool) => tool.id === over.id)

			const newOrder = arrayMove(tools, oldIndex, newIndex)
			onReorder(newOrder.map((tool: Tool) => tool.id))
		}
	}

	if (tools.length === 0) {
		return (
			<div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4">
				<p className="text-sm text-muted-foreground">
					No tools selected. Click on tools below to add them.
				</p>
			</div>
		)
	}

	return (
		<div className="rounded-lg border border-dashed bg-muted/30 p-3">
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={tools.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
					<div className="flex flex-wrap gap-2">
						{tools.map((tool) => (
							<SortableToolItem key={tool.id} tool={tool} onRemove={onRemove} />
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
}
