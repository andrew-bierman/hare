'use client'

import { Button } from '@hare/ui/components/button'
import { cn } from '@hare/ui/lib/utils'
import { MessageSquare } from 'lucide-react'

export interface ConversationStartersProps {
	starters: string[]
	onSelect: (message: string) => void
	className?: string
}

export function ConversationStarters({ starters, onSelect, className }: ConversationStartersProps) {
	if (!starters || starters.length === 0) return null

	return (
		<div className={cn('flex flex-col items-center gap-4 py-8', className)}>
			<div className="flex items-center gap-2 text-muted-foreground">
				<MessageSquare className="h-5 w-5" />
				<p className="text-sm font-medium">Try asking...</p>
			</div>
			<div className="flex flex-wrap justify-center gap-2 max-w-lg px-4">
				{starters.map((starter) => (
					<Button
						key={starter}
						variant="outline"
						size="sm"
						className="px-3 py-2 text-sm h-auto hover:bg-primary/10 hover:border-primary/50"
						onClick={() => onSelect(starter)}
					>
						{starter}
					</Button>
				))}
			</div>
		</div>
	)
}
