import { ToolCreatePage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tools/new')({
	component: ToolCreatePage,
})
