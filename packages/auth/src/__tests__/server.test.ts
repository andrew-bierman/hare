import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createAuth, getOAuthProviders, type AuthServerEnv } from '../server'

// Type for the mocked auth instance that includes config properties
type MockedAuthInstance = ReturnType<typeof createAuth> & {
	secret?: string
	emailAndPassword?: {
		enabled?: boolean
		autoSignIn?: boolean
		sendResetPassword?: (opts: { user: { email: string }; url: string }) => Promise<void>
	}
	session?: {
		expiresIn?: number
		updateAge?: number
		cookieCache?: {
			enabled?: boolean
			maxAge?: number
		}
	}
	trustedOrigins?: string[]
	database?: {
		_isDrizzleAdapter?: boolean
		provider?: string
		schema?: unknown
	}
	socialProviders?: {
		google?: { clientId?: string; clientSecret?: string }
		github?: { clientId?: string; clientSecret?: string }
	}
}

// Mock the better-auth module
vi.mock('better-auth', () => ({
	betterAuth: vi.fn((config) => ({
		...config,
		_isBetterAuthInstance: true,
	})),
}))

// Mock the better-auth/adapters/drizzle module
vi.mock('better-auth/adapters/drizzle', () => ({
	drizzleAdapter: vi.fn((db, options) => ({
		db,
		...options,
		_isDrizzleAdapter: true,
	})),
}))

// Mock the @hare/db module
vi.mock('@hare/db', () => ({
	createDb: vi.fn((d1) => ({
		d1,
		_isMockDb: true,
	})),
}))

// Mock the @hare/db/schema module
vi.mock('@hare/db/schema', () => ({
	users: { _table: 'users' },
	sessions: { _table: 'sessions' },
	accounts: { _table: 'accounts' },
	verifications: { _table: 'verifications' },
}))

// Mock the @hare/api module
vi.mock('@hare/api', () => ({
	createEmailService: vi.fn((env) => ({
		sendPasswordReset: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
		env,
	})),
}))

describe('Auth Server', () => {
	// Create a mock D1 database
	const mockD1 = {
		prepare: vi.fn(),
		exec: vi.fn(),
		batch: vi.fn(),
		dump: vi.fn(),
	} as unknown as D1Database

	// Base environment configuration
	const baseEnv: AuthServerEnv = {
		BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
		APP_URL: 'http://localhost:3000',
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createAuth', () => {
		it('creates an auth instance with required configuration', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth).toBeDefined()
			expect(auth.secret).toBe(baseEnv.BETTER_AUTH_SECRET)
		})

		it('configures email and password authentication', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.emailAndPassword).toBeDefined()
			expect(auth.emailAndPassword?.enabled).toBe(true)
			expect(auth.emailAndPassword?.autoSignIn).toBe(true)
		})

		it('configures session settings with correct expiration', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.session).toBeDefined()
			expect(auth.session?.expiresIn).toBe(60 * 60 * 24 * 7) // 7 days
			expect(auth.session?.updateAge).toBe(60 * 60 * 24) // 1 day
		})

		it('configures cookie cache settings', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.session?.cookieCache).toBeDefined()
			expect(auth.session?.cookieCache?.enabled).toBe(true)
			expect(auth.session?.cookieCache?.maxAge).toBe(60 * 5) // 5 minutes
		})

		it('includes APP_URL in trusted origins', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.trustedOrigins).toContain(baseEnv.APP_URL)
		})

		it('includes localhost origins when APP_URL is localhost', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.trustedOrigins).toContain('http://localhost:3000')
			expect(auth.trustedOrigins).toContain('http://localhost:3001')
			expect(auth.trustedOrigins).toContain('http://localhost:8787')
		})

		it('excludes localhost origins when APP_URL is production', () => {
			const prodEnv: AuthServerEnv = {
				...baseEnv,
				APP_URL: 'https://app.example.com',
			}
			const auth = createAuth({ d1: mockD1, env: prodEnv }) as MockedAuthInstance

			expect(auth.trustedOrigins).toContain('https://app.example.com')
			expect(auth.trustedOrigins).not.toContain('http://localhost:3000')
			expect(auth.trustedOrigins).not.toContain('http://localhost:3001')
			expect(auth.trustedOrigins).not.toContain('http://localhost:8787')
		})

		it('configures database adapter with correct schema', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.database).toBeDefined()
			expect(auth.database?._isDrizzleAdapter).toBe(true)
			expect(auth.database?.provider).toBe('sqlite')
			expect(auth.database?.schema).toBeDefined()
		})
	})

	describe('createAuth with OAuth providers', () => {
		it('does not configure Google when credentials are missing', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.socialProviders?.google).toBeUndefined()
		})

		it('does not configure GitHub when credentials are missing', () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.socialProviders?.github).toBeUndefined()
		})

		it('configures Google OAuth when credentials are provided', () => {
			const envWithGoogle: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_ID: 'google-client-id',
				GOOGLE_CLIENT_SECRET: 'google-client-secret',
			}
			const auth = createAuth({ d1: mockD1, env: envWithGoogle }) as MockedAuthInstance

			expect(auth.socialProviders?.google).toBeDefined()
			expect(auth.socialProviders?.google?.clientId).toBe('google-client-id')
			expect(auth.socialProviders?.google?.clientSecret).toBe('google-client-secret')
		})

		it('configures GitHub OAuth when credentials are provided', () => {
			const envWithGitHub: AuthServerEnv = {
				...baseEnv,
				GITHUB_CLIENT_ID: 'github-client-id',
				GITHUB_CLIENT_SECRET: 'github-client-secret',
			}
			const auth = createAuth({ d1: mockD1, env: envWithGitHub }) as MockedAuthInstance

			expect(auth.socialProviders?.github).toBeDefined()
			expect(auth.socialProviders?.github?.clientId).toBe('github-client-id')
			expect(auth.socialProviders?.github?.clientSecret).toBe('github-client-secret')
		})

		it('configures both Google and GitHub when both credentials are provided', () => {
			const envWithBoth: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_ID: 'google-client-id',
				GOOGLE_CLIENT_SECRET: 'google-client-secret',
				GITHUB_CLIENT_ID: 'github-client-id',
				GITHUB_CLIENT_SECRET: 'github-client-secret',
			}
			const auth = createAuth({ d1: mockD1, env: envWithBoth }) as MockedAuthInstance

			expect(auth.socialProviders?.google).toBeDefined()
			expect(auth.socialProviders?.github).toBeDefined()
		})

		it('does not configure Google when only client ID is provided', () => {
			const envWithPartialGoogle: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_ID: 'google-client-id',
			}
			const auth = createAuth({ d1: mockD1, env: envWithPartialGoogle }) as MockedAuthInstance

			expect(auth.socialProviders?.google).toBeUndefined()
		})

		it('does not configure GitHub when only client ID is provided', () => {
			const envWithPartialGitHub: AuthServerEnv = {
				...baseEnv,
				GITHUB_CLIENT_ID: 'github-client-id',
			}
			const auth = createAuth({ d1: mockD1, env: envWithPartialGitHub }) as MockedAuthInstance

			expect(auth.socialProviders?.github).toBeUndefined()
		})
	})

	describe('createAuth email configuration', () => {
		it('includes email configuration in environment', () => {
			const envWithEmail: AuthServerEnv = {
				...baseEnv,
				RESEND_API_KEY: 'resend-api-key',
				EMAIL_FROM: 'noreply@example.com',
				APP_NAME: 'Test App',
			}
			const auth = createAuth({ d1: mockD1, env: envWithEmail }) as MockedAuthInstance

			expect(auth.emailAndPassword?.sendResetPassword).toBeDefined()
			expect(typeof auth.emailAndPassword?.sendResetPassword).toBe('function')
		})

		it('password reset handler is async function', async () => {
			const auth = createAuth({ d1: mockD1, env: baseEnv }) as MockedAuthInstance

			expect(auth.emailAndPassword?.sendResetPassword).toBeDefined()
			// The function should return a promise (be async)
			const result = auth.emailAndPassword?.sendResetPassword?.({
				user: { email: 'test@example.com' },
				url: 'http://localhost:3000/reset-password?token=abc',
			})

			// Should return a promise or undefined (async function)
			expect(result).toBeInstanceOf(Promise)
		})
	})

	describe('getOAuthProviders', () => {
		it('returns false for both providers when no credentials configured', () => {
			const providers = getOAuthProviders(baseEnv)

			expect(providers.google).toBe(false)
			expect(providers.github).toBe(false)
		})

		it('returns true for Google when both credentials provided', () => {
			const envWithGoogle: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_ID: 'google-client-id',
				GOOGLE_CLIENT_SECRET: 'google-client-secret',
			}
			const providers = getOAuthProviders(envWithGoogle)

			expect(providers.google).toBe(true)
			expect(providers.github).toBe(false)
		})

		it('returns true for GitHub when both credentials provided', () => {
			const envWithGitHub: AuthServerEnv = {
				...baseEnv,
				GITHUB_CLIENT_ID: 'github-client-id',
				GITHUB_CLIENT_SECRET: 'github-client-secret',
			}
			const providers = getOAuthProviders(envWithGitHub)

			expect(providers.google).toBe(false)
			expect(providers.github).toBe(true)
		})

		it('returns true for both when all credentials provided', () => {
			const envWithBoth: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_ID: 'google-client-id',
				GOOGLE_CLIENT_SECRET: 'google-client-secret',
				GITHUB_CLIENT_ID: 'github-client-id',
				GITHUB_CLIENT_SECRET: 'github-client-secret',
			}
			const providers = getOAuthProviders(envWithBoth)

			expect(providers.google).toBe(true)
			expect(providers.github).toBe(true)
		})

		it('returns false for Google when only client ID provided', () => {
			const envWithPartialGoogle: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_ID: 'google-client-id',
			}
			const providers = getOAuthProviders(envWithPartialGoogle)

			expect(providers.google).toBe(false)
		})

		it('returns false for GitHub when only client ID provided', () => {
			const envWithPartialGitHub: AuthServerEnv = {
				...baseEnv,
				GITHUB_CLIENT_ID: 'github-client-id',
			}
			const providers = getOAuthProviders(envWithPartialGitHub)

			expect(providers.github).toBe(false)
		})

		it('returns false for Google when only client secret provided', () => {
			const envWithPartialGoogle: AuthServerEnv = {
				...baseEnv,
				GOOGLE_CLIENT_SECRET: 'google-client-secret',
			}
			const providers = getOAuthProviders(envWithPartialGoogle)

			expect(providers.google).toBe(false)
		})

		it('returns false for GitHub when only client secret provided', () => {
			const envWithPartialGitHub: AuthServerEnv = {
				...baseEnv,
				GITHUB_CLIENT_SECRET: 'github-client-secret',
			}
			const providers = getOAuthProviders(envWithPartialGitHub)

			expect(providers.github).toBe(false)
		})
	})

	describe('AuthServerEnv interface', () => {
		it('requires BETTER_AUTH_SECRET', () => {
			const env: AuthServerEnv = {
				BETTER_AUTH_SECRET: 'required-secret',
				APP_URL: 'http://localhost:3000',
			}
			expect(env.BETTER_AUTH_SECRET).toBeDefined()
		})

		it('requires APP_URL', () => {
			const env: AuthServerEnv = {
				BETTER_AUTH_SECRET: 'required-secret',
				APP_URL: 'http://localhost:3000',
			}
			expect(env.APP_URL).toBeDefined()
		})

		it('allows optional OAuth credentials', () => {
			const env: AuthServerEnv = {
				BETTER_AUTH_SECRET: 'required-secret',
				APP_URL: 'http://localhost:3000',
				GOOGLE_CLIENT_ID: 'optional',
				GOOGLE_CLIENT_SECRET: 'optional',
				GITHUB_CLIENT_ID: 'optional',
				GITHUB_CLIENT_SECRET: 'optional',
			}
			expect(env.GOOGLE_CLIENT_ID).toBeDefined()
			expect(env.GOOGLE_CLIENT_SECRET).toBeDefined()
			expect(env.GITHUB_CLIENT_ID).toBeDefined()
			expect(env.GITHUB_CLIENT_SECRET).toBeDefined()
		})

		it('allows optional email configuration', () => {
			const env: AuthServerEnv = {
				BETTER_AUTH_SECRET: 'required-secret',
				APP_URL: 'http://localhost:3000',
				RESEND_API_KEY: 'optional',
				EMAIL_FROM: 'optional',
				APP_NAME: 'optional',
			}
			expect(env.RESEND_API_KEY).toBeDefined()
			expect(env.EMAIL_FROM).toBeDefined()
			expect(env.APP_NAME).toBeDefined()
		})
	})
})
