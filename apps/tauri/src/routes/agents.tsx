import { AgentsPage } from '@hare/app/pages'
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
				newAgent: '/agents', // TODO: Add /agents/new route
				agentDetail: (_id) => `/agents`, // TODO: Add /agents/$id route
			}}
		/>
	)
}
