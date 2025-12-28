import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from 'web-app/pages/settings'

export const Route = createFileRoute('/_dashboard/dashboard/settings/')({
	component: SettingsPage,
})
