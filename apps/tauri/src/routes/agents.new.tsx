import { NewAgentPage } from '@hare/app/pages'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/agents/new')({
	component: NewAgentPageWrapper,
})

function NewAgentPageWrapper() {
	const navigate = useNavigate()

	return (
		<NewAgentPage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			onSuccess={(_agentId) => {
				// Navigate to agents list for now since we don't have agent detail page yet
				// TODO: navigate({ to: `/agents/${_agentId}` }) when agent detail page is added
				navigate({ to: '/agents' })
			}}
			onCancel={() => {
				navigate({ to: '/agents' })
			}}
			routes={{
				agentsList: '/agents',
				agentDetail: (_id) => `/agents`, // TODO: Add /agents/$id route
			}}
		/>
	)
}
