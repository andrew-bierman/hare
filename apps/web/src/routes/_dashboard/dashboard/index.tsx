import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from 'web-app/pages/dashboard'

export const Route = createFileRoute('/_dashboard/dashboard/')({
	component: DashboardPage,
})
