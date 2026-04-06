'use client'

import { createContext, type ReactNode, useContext } from 'react'

/**
 * Sign-in result from email/password authentication.
 * Compatible with Better Auth client response shape.
 */
export interface SignInResult {
	error?: {
		message?: string
		code?: string
	} | null
}

/**
 * OAuth sign-in result for Google/GitHub.
 * Compatible with Better Auth client response shape.
 */
export interface OAuthSignInResult {
	error?: {
		message?: string
		code?: string
	} | null
	redirect?: boolean
	url?: string
}

/**
 * Sign-in actions that can be performed on auth pages.
 * These are provided by the consuming app since auth implementation varies.
 */
export interface SignInActions {
	signIn: {
		email: (options: { email: string; password: string }) => Promise<SignInResult>
	}
	signInWithGoogle: () => Promise<OAuthSignInResult | undefined>
	signInWithGitHub: () => Promise<OAuthSignInResult | undefined>
}

const SignInActionsContext = createContext<SignInActions | null>(null)

export interface SignInActionsProviderProps {
	children: ReactNode
	actions: SignInActions
}

/**
 * Provider for sign-in actions.
 * Apps should wrap auth pages with this provider to supply auth functions.
 */
export function SignInActionsProvider({ children, actions }: SignInActionsProviderProps) {
	return <SignInActionsContext.Provider value={actions}>{children}</SignInActionsContext.Provider>
}

/**
 * Hook to access sign-in actions (signIn.email, signInWithGoogle, signInWithGitHub).
 * Must be used within a SignInActionsProvider.
 */
export function useSignInActions(): SignInActions {
	const context = useContext(SignInActionsContext)
	if (!context) {
		throw new Error('useSignInActions must be used within SignInActionsProvider')
	}
	return context
}
