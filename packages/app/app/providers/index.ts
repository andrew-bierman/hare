/**
 * Application Providers
 *
 * Context providers for the application.
 */

export { queryClient, QueryProvider } from './query-provider'
export { useWorkspace, WorkspaceProvider } from './workspace-provider'

// Re-export auth context from features for convenience
export {
	AuthProvider,
	useAuth,
	useAuthActions,
	type AuthActions,
	type AuthContextValue,
	type AuthProviderProps,
	type Session,
} from '../../features/auth'
