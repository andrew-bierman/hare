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

// Get base URL from environment or window.location.origin
function getDefaultBaseURL() {
	// Check for Vite environment variable (used by Tauri and other Vite apps)
	if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
		return import.meta.env.VITE_API_URL as string
	}
	// Fall back to window.location.origin
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return undefined
}

// Default auth client instance
export const authClient = createHareAuthClient({
	baseURL: getDefaultBaseURL(),
})

// Re-export commonly used auth methods from default client
export const { signIn, signUp, signOut, useSession, getSession, requestPasswordReset, resetPassword } = authClient

/**
 * Update user profile (name, image)
 * @param data - Object containing fields to update
 * @returns Promise with updated user data
 */
export async function updateUser(data: { name?: string; image?: string }) {
	return authClient.updateUser(data)
}

/**
 * Change user password
 * @param options - Current password and new password
 * @returns Promise with result
 */
export async function changePassword(options: {
	currentPassword: string
	newPassword: string
	revokeOtherSessions?: boolean
}) {
	return authClient.changePassword(options)
}

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
