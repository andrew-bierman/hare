/**
 * Tauri App Providers
 *
 * Application-level providers for the Tauri desktop app.
 */

export { AuthProvider, useAuth } from './auth-provider'
export { Providers } from './providers'
export { QueryProvider, queryClient } from './query-provider'

// Re-export from @hare/app/providers
export { useWorkspace, WorkspaceProvider } from '@hare/app/providers'
