import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysPage } from 'web-app/pages/settings'

export const Route = createFileRoute('/_dashboard/dashboard/settings/api-keys')({
	component: ApiKeysPage,
})
