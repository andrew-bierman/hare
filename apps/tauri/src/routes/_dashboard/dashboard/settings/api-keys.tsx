import { ApiKeysPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/settings/api-keys')({
	component: ApiKeysPage,
})
