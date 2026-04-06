// Server-side exports

// Client-side exports
export {
	authClient,
	type CreateAuthClientOptions,
	changePassword,
	createHareAuthClient,
	getSession,
	signIn,
	signInWithGitHub,
	signInWithGoogle,
	signOut,
	signUp,
	updateUser,
	useSession,
} from './client'
export {
	type Auth,
	type AuthServerEnv,
	type CreateAuthOptions,
	createAuth,
	getOAuthProviders,
} from './server'
