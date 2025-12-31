'use client'

import {
	InstructionsEditor,
	type InstructionsEditorProps,
} from '@hare/ui/components/instructions-editor'
import { config } from '@hare/config'

interface AgentInstructionsEditorProps extends Omit<InstructionsEditorProps, 'maxLength'> {
	maxLength?: number
}

export function AgentInstructionsEditor({
	value,
	onChange,
	disabled,
	placeholder = 'Write your agent instructions here. You can use Markdown formatting and template variables like {{user_name}}.',
	minHeight = '300px',
	maxHeight = '600px',
	maxLength = config.agents.limits.instructionsMaxLength,
	...props
}: AgentInstructionsEditorProps) {
	return (
		<InstructionsEditor
			value={value}
			onChange={onChange}
			disabled={disabled}
			placeholder={placeholder}
			minHeight={minHeight}
			maxHeight={maxHeight}
			maxLength={maxLength}
			showLineNumbers={true}
			{...props}
		/>
	)
}
