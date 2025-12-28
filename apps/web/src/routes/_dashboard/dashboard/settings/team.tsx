import { createFileRoute } from '@tanstack/react-router'
import { TeamPage } from '@hare/app/pages'

export const Route = createFileRoute('/_dashboard/dashboard/settings/team')({
	component: TeamPage,
})
