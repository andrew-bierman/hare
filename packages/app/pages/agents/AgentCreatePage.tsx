'use client'

import { useSearch } from '@tanstack/react-router'
import { CreateAgentForm } from '../../features/create-agent'
import { useWorkspace } from '../../app/providers'
import { getTemplateById } from '@hare/config'

export function AgentCreatePage() {
	const { activeWorkspace } = useWorkspace()
	const search = useSearch({ strict: false }) as { template?: string }
	const templateId = search?.template
	const template = templateId ? getTemplateById(templateId) : undefined

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						{template ? `Create ${template.name} Agent` : 'Create New Agent'}
					</h2>
					<p className="text-muted-foreground mt-2">
						{template
							? template.description
							: 'Set up a new AI agent for your workspace'}
					</p>
				</div>
			</div>

			<CreateAgentForm workspaceId={activeWorkspace?.id} templateId={templateId} />
		</div>
	)
}
