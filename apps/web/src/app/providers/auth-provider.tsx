'use client'

import { createContext, type ReactNode, useContext } from 'react'
import { useSession } from '@hare/auth/client'

type Session = ReturnType<typeof useSession>

const AuthContext = createContext<Session | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const session = useSession()

	return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}
