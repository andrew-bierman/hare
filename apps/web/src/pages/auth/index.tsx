/**
 * Auth Pages
 * Re-exported from @hare/app package with auth actions provider
 */

'use client'

import {
	SignInPage as BaseSignInPage,
	type SignInActions,
	SignInActionsProvider,
} from '@hare/app/pages'
import { signIn, signInWithGitHub, signInWithGoogle } from 'web-app/lib/auth-client'

const authActions: SignInActions = {
	signIn: {
		email: async (options) => {
			const result = await signIn.email(options)
			if (result.error) {
				return { error: { message: result.error.message || 'Failed to sign in' } }
			}
			return {}
		},
	},
	signInWithGoogle: async () => {
		await signInWithGoogle()
	},
	signInWithGitHub: async () => {
		await signInWithGitHub()
	},
}

export function SignInPage() {
	return (
		<SignInActionsProvider actions={authActions}>
			<BaseSignInPage />
		</SignInActionsProvider>
	)
}
