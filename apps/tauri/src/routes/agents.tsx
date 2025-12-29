import { AgentsListPage, useAgentsQuery } from '@hare/app'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/agents')({
	component: AgentsPageWrapper,
})

function AgentsPageWrapper() {
	return (
		<AgentsListPage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			routes={{
				newAgent: '/agents/new',
				agentDetail: (id) => `/agents/${id}`,
			}}
			useAgentsQuery={useAgentsQuery}
		/>
	)
}
