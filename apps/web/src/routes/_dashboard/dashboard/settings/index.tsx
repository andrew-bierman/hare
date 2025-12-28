import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@hare/app/pages'

export const Route = createFileRoute('/_dashboard/dashboard/settings/')({
	component: SettingsPage,
})
