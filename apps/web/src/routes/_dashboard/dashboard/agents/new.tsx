import { AgentCreatePage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

type AgentNewSearch = {
	template?: string
}

export const Route = createFileRoute('/_dashboard/dashboard/agents/new')({
	component: AgentCreatePage,
	validateSearch: (search: Record<string, unknown>): AgentNewSearch => ({
		template: typeof search.template === 'string' ? search.template : undefined,
	}),
})
