// Server-side exports
export {
	createAuth,
	getOAuthProviders,
	type Auth,
	type AuthServerEnv,
	type CreateAuthOptions,
} from './server'

// Client-side exports
export {
	createHareAuthClient,
	authClient,
	signIn,
	signUp,
	signOut,
	useSession,
	getSession,
	signInWithGoogle,
	signInWithGitHub,
	type CreateAuthClientOptions,
} from './client'
