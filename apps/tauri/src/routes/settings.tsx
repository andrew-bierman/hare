import { SettingsPage } from '@hare/app/pages'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
	component: SettingsPageWrapper,
})

function SettingsPageWrapper() {
	return (
		<SettingsPage
			renderLink={({ to, children, className }) => (
				<Link to={to as '/'} className={className}>
					{children}
				</Link>
			)}
			routes={{
				billing: '/settings/billing',
				team: '/settings/team',
				apiKeys: '/settings/api-keys',
			}}
		/>
	)
}
