import { createFileRoute, useSearch } from '@tanstack/react-router'
import { BillingPage } from 'web-app/pages/settings'

export const Route = createFileRoute('/_dashboard/dashboard/settings/billing')({
	component: BillingPageWrapper,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			success: search.success === 'true' ? 'true' : undefined,
			canceled: search.canceled === 'true' ? 'true' : undefined,
		}
	},
})

function BillingPageWrapper() {
	const search = useSearch({ from: '/_dashboard/dashboard/settings/billing' })
	return <BillingPage searchParams={search} />
}
