import { createFileRoute } from '@tanstack/react-router'
import { SignInPage } from 'web-app/pages/auth'

export const Route = createFileRoute('/_auth/sign-in')({
	component: SignInPage,
})
