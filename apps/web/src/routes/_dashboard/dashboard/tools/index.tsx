import { createFileRoute } from '@tanstack/react-router'
import { ToolsListPage } from 'web-app/pages/tools'

export const Route = createFileRoute('/_dashboard/dashboard/tools/')({
	component: ToolsListPage,
})
