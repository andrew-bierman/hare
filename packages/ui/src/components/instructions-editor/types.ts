export interface InstructionsEditorProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	minHeight?: string
	maxHeight?: string
	maxLength?: number
	showLineNumbers?: boolean
	showToolbar?: boolean
	templateVariables?: TemplateVariable[]
	onTokenCountChange?: (count: number) => void
	className?: string
	disabled?: boolean
}

export interface TemplateVariable {
	name: string
	description: string
	example?: string
	category?: string
}

export interface EditorStats {
	characters: number
	words: number
	lines: number
	tokens: number
}
