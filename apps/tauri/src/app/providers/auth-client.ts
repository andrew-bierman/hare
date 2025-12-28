/**
 * Tauri Auth Client
 *
 * Creates a Better Auth client configured to use the web API.
 * Uses VITE_API_URL environment variable or defaults to production.
 */

import { createHareAuthClient } from '@hare/auth/client'

// Get API base URL from environment or default to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hare.dev'

// Create auth client pointing to web API
export const authClient = createHareAuthClient({
	baseURL: API_BASE_URL,
})

// Re-export auth methods from configured client
export const { signIn, signUp, signOut, useSession, getSession } = authClient
