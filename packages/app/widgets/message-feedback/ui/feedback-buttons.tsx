'use client'

import { Button } from '@hare/ui/components/button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@hare/ui/components/tooltip'
import { cn } from '@hare/ui/lib/utils'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'

export interface FeedbackButtonsProps {
	messageId: string
	conversationId: string
	agentId: string
	onFeedback?: (options: {
		messageId: string
		conversationId: string
		agentId: string
		rating: 'positive' | 'negative'
	}) => void
	className?: string
}

export function FeedbackButtons({
	messageId,
	conversationId,
	agentId,
	onFeedback,
	className,
}: FeedbackButtonsProps) {
	const [selected, setSelected] = useState<'positive' | 'negative' | null>(null)

	const handleFeedback = (rating: 'positive' | 'negative') => {
		const newRating = selected === rating ? null : rating
		setSelected(newRating)
		if (newRating && onFeedback) {
			onFeedback({ messageId, conversationId, agentId, rating: newRating })
		}
	}

	return (
		<div className={cn('flex items-center gap-1', className)}>
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								'h-6 w-6 text-muted-foreground hover:text-green-600',
								selected === 'positive' && 'text-green-600 bg-green-50 dark:bg-green-950',
							)}
							onClick={() => handleFeedback('positive')}
						>
							<ThumbsUp className="h-3.5 w-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p>Good response</p>
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								'h-6 w-6 text-muted-foreground hover:text-red-600',
								selected === 'negative' && 'text-red-600 bg-red-50 dark:bg-red-950',
							)}
							onClick={() => handleFeedback('negative')}
						>
							<ThumbsDown className="h-3.5 w-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p>Poor response</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
}
