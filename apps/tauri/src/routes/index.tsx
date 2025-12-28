import { DashboardHome } from '@hare/app/pages'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAgents, useUsage } from '../lib/hooks'

export const Route = createFileRoute('/')({
	component: HomePageWrapper,
})

function HomePageWrapper() {
	return (
		<DashboardHome
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			routes={{
				newAgent: '/agents/new',
				agents: '/agents',
				agentDetail: (_id) => `/agents`, // TODO: Add /agents/$id route
				tools: '/tools',
				usage: '/', // No usage page in tauri yet
			}}
			useAgents={useAgents}
			useUsage={useUsage}
		/>
	)
}
