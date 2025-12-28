'use client'

import { createContext, type ReactNode, useContext } from 'react'

/**
 * Session data structure returned by the auth system.
 */
export interface Session {
	user: {
		id: string
		email: string
		name: string | null
		image: string | null
	} | null
}

/**
 * Auth context value type.
 */
export interface AuthContextValue {
	data: Session | null
	isPending: boolean
	error: Error | null
}

/**
 * Auth actions that can be performed.
 */
export interface AuthActions {
	signOut: () => Promise<void>
	signIn?: {
		social: (options: { provider: string; callbackURL?: string }) => Promise<void>
	}
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AuthActionsContext = createContext<AuthActions | null>(null)

export interface AuthProviderProps {
	children: ReactNode
	session: AuthContextValue
	actions: AuthActions
}

/**
 * Provider for auth context.
 * Apps should wrap this with their own provider that supplies the session and actions.
 */
export function AuthProvider({ children, session, actions }: AuthProviderProps) {
	return (
		<AuthContext.Provider value={session}>
			<AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
		</AuthContext.Provider>
	)
}

/**
 * Hook to access auth session data.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}

/**
 * Hook to access auth actions (signOut, etc).
 * Must be used within an AuthProvider.
 */
export function useAuthActions(): AuthActions {
	const context = useContext(AuthActionsContext)
	if (!context) {
		throw new Error('useAuthActions must be used within AuthProvider')
	}
	return context
}
