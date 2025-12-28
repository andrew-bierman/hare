import { GenericToolsPage as ToolsPage } from '@hare/app'
import { useToolsQuery } from '@hare/app/shared/api'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/tools')({
	component: ToolsPageWrapper,
})

function ToolsPageWrapper() {
	return (
		<ToolsPage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			routes={{
				newTool: '/tools', // TODO: Add /tools/new route
				toolDetail: (_id) => `/tools`, // TODO: Add /tools/$id route
			}}
			useTools={useToolsQuery}
		/>
	)
}
