import { ToolDetailPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/tools/$id')({
	component: ToolDetailPageWrapper,
})

function ToolDetailPageWrapper() {
	const { id } = Route.useParams()
	return <ToolDetailPage toolId={id} toolsListPath="/dashboard/tools" />
}
