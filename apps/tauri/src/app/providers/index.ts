/**
 * Tauri App Providers
 *
 * Same structure as web, but with auth client configured for remote API.
 */

export { authClient, signIn, signUp, signOut, useSession, getSession } from './auth-client'
export { AuthProvider, useAuth } from './auth-provider'
export { Providers } from './providers'
export { QueryProvider, queryClient } from './query-provider'
export { useWorkspace, WorkspaceProvider } from './workspace-provider'
