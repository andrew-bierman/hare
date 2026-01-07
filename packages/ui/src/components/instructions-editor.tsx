'use client'

import { Textarea } from './textarea'

export interface InstructionsEditorProps {
	value: string
	onChange: (value: string) => void
	disabled?: boolean
	placeholder?: string
	minHeight?: string
	maxHeight?: string
	maxLength?: number
	showLineNumbers?: boolean
}

/**
 * Instructions editor component for agent instructions.
 * Currently a simple textarea wrapper - can be enhanced with
 * CodeMirror or similar for syntax highlighting.
 */
export function InstructionsEditor({
	value,
	onChange,
	disabled,
	placeholder,
	minHeight = '200px',
	maxHeight = '400px',
	maxLength,
}: InstructionsEditorProps) {
	return (
		<Textarea
			value={value}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			placeholder={placeholder}
			maxLength={maxLength}
			style={{ minHeight, maxHeight }}
			className="font-mono text-sm"
		/>
	)
}
