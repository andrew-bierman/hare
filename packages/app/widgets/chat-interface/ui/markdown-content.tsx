'use client'

import { Streamdown } from 'streamdown'
import { cn } from '@hare/ui/lib/utils'

export interface MarkdownContentProps {
	/** The markdown content to render */
	content: string
	/** Whether this is currently streaming (shows cursor) */
	isStreaming?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Markdown content renderer using Streamdown.
 * Optimized for AI streaming responses.
 */
export function MarkdownContent({ content, isStreaming, className }: MarkdownContentProps) {
	if (!content) return null

	return (
		<div
			className={cn(
				'prose prose-sm dark:prose-invert max-w-none',
				// Override prose defaults for chat context
				'prose-p:my-1 prose-p:leading-relaxed',
				'prose-pre:my-2 prose-pre:bg-muted prose-pre:text-foreground',
				'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none',
				'prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
				'prose-headings:my-2 prose-headings:font-semibold',
				'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
				'prose-blockquote:my-2 prose-blockquote:border-l-primary',
				isStreaming && 'streamdown-streaming',
				className,
			)}
		>
			<Streamdown>{content}</Streamdown>
		</div>
	)
}
