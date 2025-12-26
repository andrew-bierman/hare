'use client'

import { ToolCallBlock } from './tool-call-block'
import type { ToolCallData } from 'web-app/lib/api/hooks/use-chat'

interface ToolCallListProps {
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
