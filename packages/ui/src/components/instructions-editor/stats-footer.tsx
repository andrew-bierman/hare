'use client'

import type { TokenCountResult } from './use-token-count'

interface StatsFooterProps {
	stats: TokenCountResult
	maxLength?: number
}

export function StatsFooter({ stats, maxLength }: StatsFooterProps) {
	const { characters, words, lines, tokens, isLoading } = stats

	const characterLimitReached = maxLength && characters > maxLength

	return (
		<div className="flex items-center justify-between px-3 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
			<div className="flex items-center gap-4">
				<span className={characterLimitReached ? 'text-destructive font-medium' : ''}>
					{characters.toLocaleString()} {maxLength ? `/ ${maxLength.toLocaleString()}` : ''}{' '}
					characters
				</span>
				<span>{words.toLocaleString()} words</span>
				<span>{lines.toLocaleString()} lines</span>
			</div>
			<div className="flex items-center gap-2">
				{isLoading ? (
					<span className="text-muted-foreground">Calculating tokens...</span>
				) : (
					<span>~{tokens.toLocaleString()} tokens</span>
				)}
			</div>
		</div>
	)
}
