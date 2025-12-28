import { AgentCreatePage } from '@hare/app/pages'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/agents/new')({
	component: AgentCreatePageWrapper,
})

function AgentCreatePageWrapper() {
	return (
		<AgentCreatePage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
		/>
	)
}
