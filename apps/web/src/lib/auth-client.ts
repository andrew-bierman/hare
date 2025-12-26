import { createAuthClient } from 'better-auth/react'
import { clientEnv } from 'web-app/lib/env/client'

export const authClient = createAuthClient({
	baseURL: typeof window !== 'undefined' ? window.location.origin : clientEnv.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
