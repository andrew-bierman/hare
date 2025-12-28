import { DashboardHome } from '@hare/app/pages'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/')({
	component: DashboardPageWrapper,
})

function DashboardPageWrapper() {
	return (
		<DashboardHome
			renderLink={({ to, children, className }) => (
				<Link to={to} className={className}>
					{children}
				</Link>
			)}
		/>
	)
}
