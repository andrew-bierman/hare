'use client'

import { Bold, Code, Heading1, Heading2, Italic, Link, List, Quote } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ToolbarProps {
	onAction: (action: ToolbarAction) => void
	disabled?: boolean
	className?: string
}

export type ToolbarAction =
	| 'bold'
	| 'italic'
	| 'code'
	| 'codeBlock'
	| 'heading1'
	| 'heading2'
	| 'bulletList'
	| 'link'
	| 'quote'

interface ToolbarButton {
	action: ToolbarAction
	icon: React.ComponentType<{ className?: string }>
	label: string
	shortcut?: string
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
	{ action: 'bold', icon: Bold, label: 'Bold', shortcut: 'Ctrl+B' },
	{ action: 'italic', icon: Italic, label: 'Italic', shortcut: 'Ctrl+I' },
	{ action: 'code', icon: Code, label: 'Inline Code', shortcut: 'Ctrl+`' },
	{ action: 'heading1', icon: Heading1, label: 'Heading 1' },
	{ action: 'heading2', icon: Heading2, label: 'Heading 2' },
	{ action: 'bulletList', icon: List, label: 'Bullet List' },
	{ action: 'link', icon: Link, label: 'Link', shortcut: 'Ctrl+K' },
	{ action: 'quote', icon: Quote, label: 'Quote' },
]

export function Toolbar({ onAction, disabled, className }: ToolbarProps) {
	return (
		<div
			className={cn(
				'flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30',
				disabled && 'opacity-50 pointer-events-none',
				className,
			)}
		>
			{TOOLBAR_BUTTONS.map((button) => (
				<button
					key={button.action}
					type="button"
					onClick={() => onAction(button.action)}
					disabled={disabled}
					title={button.shortcut ? `${button.label} (${button.shortcut})` : button.label}
					className={cn(
						'p-1.5 rounded hover:bg-muted transition-colors',
						'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
						'disabled:opacity-50 disabled:cursor-not-allowed',
					)}
				>
					<button.icon className="h-4 w-4 text-muted-foreground" />
				</button>
			))}
		</div>
	)
}

// Markdown formatting helpers
export function applyMarkdownFormat(options: {
	text: string
	selectionStart: number
	selectionEnd: number
	action: ToolbarAction
}): { text: string; selectionStart: number; selectionEnd: number } {
	const { text, selectionStart, selectionEnd, action } = options
	const selectedText = text.substring(selectionStart, selectionEnd)
	const beforeSelection = text.substring(0, selectionStart)
	const afterSelection = text.substring(selectionEnd)

	let newText: string
	let newSelectionStart: number
	let newSelectionEnd: number

	switch (action) {
		case 'bold':
			newText = `${beforeSelection}**${selectedText}**${afterSelection}`
			newSelectionStart = selectionStart + 2
			newSelectionEnd = selectionEnd + 2
			break

		case 'italic':
			newText = `${beforeSelection}_${selectedText}_${afterSelection}`
			newSelectionStart = selectionStart + 1
			newSelectionEnd = selectionEnd + 1
			break

		case 'code':
			newText = `${beforeSelection}\`${selectedText}\`${afterSelection}`
			newSelectionStart = selectionStart + 1
			newSelectionEnd = selectionEnd + 1
			break

		case 'codeBlock':
			newText = `${beforeSelection}\n\`\`\`\n${selectedText}\n\`\`\`\n${afterSelection}`
			newSelectionStart = selectionStart + 5
			newSelectionEnd = selectionEnd + 5
			break

		case 'heading1':
			// If at start of line or newline
			if (selectionStart === 0 || beforeSelection.endsWith('\n')) {
				newText = `${beforeSelection}# ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 2
				newSelectionEnd = selectionEnd + 2
			} else {
				newText = `${beforeSelection}\n# ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 3
				newSelectionEnd = selectionEnd + 3
			}
			break

		case 'heading2':
			if (selectionStart === 0 || beforeSelection.endsWith('\n')) {
				newText = `${beforeSelection}## ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 3
				newSelectionEnd = selectionEnd + 3
			} else {
				newText = `${beforeSelection}\n## ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 4
				newSelectionEnd = selectionEnd + 4
			}
			break

		case 'bulletList':
			if (selectionStart === 0 || beforeSelection.endsWith('\n')) {
				newText = `${beforeSelection}- ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 2
				newSelectionEnd = selectionEnd + 2
			} else {
				newText = `${beforeSelection}\n- ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 3
				newSelectionEnd = selectionEnd + 3
			}
			break

		case 'link':
			newText = `${beforeSelection}[${selectedText}](url)${afterSelection}`
			newSelectionStart = selectionEnd + 3
			newSelectionEnd = selectionEnd + 6
			break

		case 'quote':
			if (selectionStart === 0 || beforeSelection.endsWith('\n')) {
				newText = `${beforeSelection}> ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 2
				newSelectionEnd = selectionEnd + 2
			} else {
				newText = `${beforeSelection}\n> ${selectedText}${afterSelection}`
				newSelectionStart = selectionStart + 3
				newSelectionEnd = selectionEnd + 3
			}
			break

		default:
			return { text, selectionStart, selectionEnd }
	}

	return { text: newText, selectionStart: newSelectionStart, selectionEnd: newSelectionEnd }
}
