import { createFileRoute } from '@tanstack/react-router'
import { ToolsListPage } from '@hare/app/pages'

export const Route = createFileRoute('/_dashboard/dashboard/tools/')({
	component: ToolsListPage,
})
