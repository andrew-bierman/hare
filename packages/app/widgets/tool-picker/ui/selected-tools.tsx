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
			const oldIndex = tools.findIndex((tool) => tool.id === active.id)
			const newIndex = tools.findIndex((tool) => tool.id === over.id)

			const newOrder = arrayMove(tools, oldIndex, newIndex)
			onReorder(newOrder.map((tool) => tool.id))
		}
	}

	if (tools.length === 0) {
		return null
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={tools.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
				<div className="flex flex-wrap gap-1.5">
					{tools.map((tool) => (
						<SortableToolItem key={tool.id} tool={tool} onRemove={onRemove} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	)
}
