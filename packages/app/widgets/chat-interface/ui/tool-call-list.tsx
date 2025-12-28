'use client'

import type { ToolCallData } from '../../../shared/api/hooks'
import { ToolCallBlock } from './tool-call-block'

export interface ToolCallListProps {
	toolCalls: ToolCallData[]
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
	if (!toolCalls || toolCalls.length === 0) {
		return null
	}

	return (
		<div className="space-y-2">
			{toolCalls.map((toolCall) => (
				<ToolCallBlock key={toolCall.id} toolCall={toolCall} />
			))}
		</div>
	)
}
