import { ToolsListPage } from '@hare/app'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tools/')({
	component: ToolsPageWrapper,
})

function ToolsPageWrapper() {
	return <ToolsListPage />
}
