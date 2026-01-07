import { ToolDetailPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tools/$id')({
	component: ToolDetailPageWrapper,
})

function ToolDetailPageWrapper() {
	const { id } = Route.useParams()
	return <ToolDetailPage toolId={id} toolsListPath="/tools" />
}
