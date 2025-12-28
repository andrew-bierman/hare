/**
 * Auth Feature
 *
 * Authentication context and actions for sign-in, sign-out, etc.
 */

// Context and hooks
export {
	AuthProvider,
	useAuth,
	useAuthActions,
	type AuthActions,
	type AuthContextValue,
	type AuthProviderProps,
	type Session,
} from './context'

// Sign-in actions
export {
	SignInActionsProvider,
	useSignInActions,
	type SignInActions,
	type SignInActionsProviderProps,
	type SignInResult,
} from './actions'

// UI Components
export { SignOutButton } from './ui/SignOutButton'
