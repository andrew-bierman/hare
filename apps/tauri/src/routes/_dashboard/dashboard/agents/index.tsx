import { createFileRoute, Link } from '@tanstack/react-router'
import { GenericAgentsPage } from '@hare/app/pages'
import { useAgentsQuery } from '@hare/app/shared/api'

export const Route = createFileRoute('/_dashboard/dashboard/agents/')({
	component: AgentsRoute,
})

function AgentsRoute() {
	return (
		<GenericAgentsPage
			renderLink={({ to, children, className }) => (
				<Link to={to} className={className}>
					{children}
				</Link>
			)}
			routes={{
				newAgent: '/dashboard/agents/new',
				agentDetail: (id) => `/dashboard/agents/${id}`,
			}}
			useAgents={useAgentsQuery}
		/>
	)
}
