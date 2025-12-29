import { ToolsListPage, useToolsQuery } from '@hare/app'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/tools/')({
	component: ToolsPageWrapper,
})

function ToolsPageWrapper() {
	return (
		<ToolsListPage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			routes={{
				newTool: '/tools/new',
				toolDetail: (id) => `/tools/${id}`,
			}}
			useToolsQuery={useToolsQuery}
		/>
	)
}
