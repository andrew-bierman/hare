'use client'

import {
	InstructionsEditor,
	type InstructionsEditorProps,
} from '@workspace/ui/components/instructions-editor'
import { AGENT_LIMITS } from '@shared/config'

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
	maxLength = AGENT_LIMITS.instructionsMaxLength,
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
