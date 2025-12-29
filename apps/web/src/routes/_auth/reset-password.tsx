import { ResetPasswordPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
	token: z.string().optional(),
})

export const Route = createFileRoute('/_auth/reset-password')({
	validateSearch: searchSchema,
	component: ResetPasswordPageWrapper,
})

function ResetPasswordPageWrapper() {
	const { token } = Route.useSearch()
	return <ResetPasswordPage token={token ?? null} />
}
