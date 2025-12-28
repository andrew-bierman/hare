import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysPage } from '@hare/app/pages'

export const Route = createFileRoute('/_dashboard/dashboard/settings/api-keys')({
	component: ApiKeysPage,
})
