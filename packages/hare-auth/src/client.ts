import { createAuthClient } from 'better-auth/react'

/**
 * Options for creating auth client
 */
export interface CreateAuthClientOptions {
	baseURL?: string
}

/**
 * Create a Better Auth client for React applications
 */
export function createHareAuthClient(options?: CreateAuthClientOptions) {
	const baseURL =
		options?.baseURL ?? (typeof window !== 'undefined' ? window.location.origin : undefined)

	return createAuthClient({
		baseURL,
	})
}

// Default auth client instance (uses window.location.origin in browser)
export const authClient = createHareAuthClient()

// Re-export commonly used auth methods from default client
export const { signIn, signUp, signOut, useSession, getSession } = authClient

/**
 * Sign in with Google OAuth
 */
export function signInWithGoogle(callbackURL = '/dashboard') {
	return signIn.social({
		provider: 'google',
		callbackURL,
	})
}

/**
 * Sign in with GitHub OAuth
 */
export function signInWithGitHub(callbackURL = '/dashboard') {
	return signIn.social({
		provider: 'github',
		callbackURL,
	})
}
