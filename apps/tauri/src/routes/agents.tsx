import { AgentsPage, useAgentsQuery } from '@hare/app'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/agents')({
	component: AgentsPageWrapper,
})

function AgentsPageWrapper() {
	return (
		<AgentsPage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			routes={{
				newAgent: '/agents/new',
				agentDetail: (_id) => `/agents`, // TODO: Add /agents/$id route
			}}
			useAgentsQuery={useAgentsQuery}
		/>
	)
}
