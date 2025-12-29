/**
 * Tauri Auth Client
 *
 * Creates a Better Auth client configured to use the web API.
 */

import { createHareAuthClient } from '@hare/auth/client'
import { env } from '../../lib/env'

// Create auth client pointing to web API
export const authClient = createHareAuthClient({
	baseURL: env.VITE_API_URL,
})

// Re-export auth methods from configured client
export const { signIn, signUp, signOut, useSession, getSession } = authClient
