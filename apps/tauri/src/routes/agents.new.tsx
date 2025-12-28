import { NewAgentPage } from '@hare/app/pages'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/agents/new')({
	component: NewAgentPageWrapper,
})

function NewAgentPageWrapper() {
	const navigate = useNavigate()

	return (
		<NewAgentPage
			onSuccess={(_agentId) => {
				// Navigate to agents list for now since we don't have agent detail page yet
				// TODO: navigate({ to: `/agents/${_agentId}` }) when agent detail page is added
				navigate({ to: '/agents' })
			}}
			onCancel={() => {
				navigate({ to: '/agents' })
			}}
		/>
	)
}
