import { SettingsPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
	component: SettingsPageWrapper,
})

function SettingsPageWrapper() {
	return <SettingsPage />
}
