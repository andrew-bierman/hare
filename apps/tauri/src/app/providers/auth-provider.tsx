'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

/**
 * Tauri auth provider that fetches session from web API.
 * In a desktop app, we might use stored tokens or OAuth flow.
 */

interface User {
	id: string
	email: string
	name: string | null
	image: string | null
}

interface Session {
	user: User | null
}

interface AuthContextValue {
	data: Session | null
	isPending: boolean
	error: Error | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Get API base URL from environment or default to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hare.dev'

async function fetchSession(): Promise<Session | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
			credentials: 'include',
		})
		if (!response.ok) {
			return null
		}
		return response.json()
	} catch {
		return null
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const { data, isPending, error } = useQuery({
		queryKey: ['auth', 'session'],
		queryFn: fetchSession,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false,
	})

	const value: AuthContextValue = {
		data: data ?? null,
		isPending,
		error: error ?? null,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}
