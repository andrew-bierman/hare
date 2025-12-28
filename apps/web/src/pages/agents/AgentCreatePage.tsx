'use client'

import { CreateAgentForm } from 'web-app/features/create-agent'
import { useWorkspace } from 'web-app/app/providers/workspace-provider'

export function AgentCreatePage() {
	const { activeWorkspace } = useWorkspace()

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Create New Agent</h2>
					<p className="text-muted-foreground mt-2">Set up a new AI agent for your workspace</p>
				</div>
			</div>

			<CreateAgentForm workspaceId={activeWorkspace?.id} />
		</div>
	)
}
