import { SignInPage } from '@hare/app/pages'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/sign-in')({
	component: SignInPage,
})
