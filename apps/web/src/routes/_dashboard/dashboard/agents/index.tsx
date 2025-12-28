import { AgentsPage } from '@hare/app/pages'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/')({
	component: AgentsPageWrapper,
})

function AgentsPageWrapper() {
	return (
		<AgentsPage
			renderLink={({ to, children, className }) => (
				<Link to={to} className={className}>
					{children}
				</Link>
			)}
		/>
	)
}
