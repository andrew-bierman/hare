import { createFileRoute } from '@tanstack/react-router'
import { TeamPage } from 'web-app/pages/settings'

export const Route = createFileRoute('/_dashboard/dashboard/settings/team')({
	component: TeamPage,
})
