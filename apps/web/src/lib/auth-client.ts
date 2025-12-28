// Re-export all client-side auth functionality from @hare/auth
export {
	authClient,
	type CreateAuthClientOptions,
	createHareAuthClient,
	getSession,
	signIn,
	signInWithGitHub,
	signInWithGoogle,
	signOut,
	signUp,
	useSession,
} from '@hare/auth/client'
