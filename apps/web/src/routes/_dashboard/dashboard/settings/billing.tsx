import { BillingPage } from '@hare/app/pages'
import { createFileRoute, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard/settings/billing')({
	component: BillingPageWrapper,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			credits: typeof search.credits === 'string' ? search.credits : undefined,
		}
	},
})

function BillingPageWrapper() {
	const search = useSearch({ from: '/_dashboard/dashboard/settings/billing' })
	return <BillingPage searchParams={search} />
}
