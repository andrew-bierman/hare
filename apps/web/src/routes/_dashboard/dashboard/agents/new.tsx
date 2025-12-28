import { NewAgentPage } from '@hare/app/pages'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/agents/new')({
	component: NewAgentPageWrapper,
})

function NewAgentPageWrapper() {
	const navigate = useNavigate()

	return (
		<NewAgentPage
			renderLink={({ to, children, className }) => (
				<Link to={to} className={className}>
					{children}
				</Link>
			)}
			onSuccess={(agentId) => {
				navigate({ to: `/dashboard/agents/${agentId}` })
			}}
			onCancel={() => {
				navigate({ to: '/dashboard/agents' })
			}}
		/>
	)
}
