import { describe, expect, it, vi } from 'vitest'

// Mock dependencies before importing
vi.mock('better-auth', () => ({
	betterAuth: vi.fn((config) => ({
		...config,
		_isBetterAuthInstance: true,
	})),
}))

vi.mock('better-auth/adapters/drizzle', () => ({
	drizzleAdapter: vi.fn((db, options) => ({
		db,
		...options,
		_isDrizzleAdapter: true,
	})),
}))

vi.mock('@hare/db', () => ({
	createDb: vi.fn((d1) => ({
		d1,
		_isMockDb: true,
	})),
}))

vi.mock('@hare/db/schema', () => ({
	users: { _table: 'users' },
	sessions: { _table: 'sessions' },
	accounts: { _table: 'accounts' },
	verifications: { _table: 'verifications' },
}))

vi.mock('@hare/api', () => ({
	createEmailService: vi.fn((env) => ({
		sendPasswordReset: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
		env,
	})),
}))

const { mockAuthClient } = vi.hoisted(() => {
	const mockSignIn = {
		social: vi.fn().mockResolvedValue({ success: true }),
	}
	const mockSignUp = vi.fn().mockResolvedValue({ success: true })
	const mockSignOut = vi.fn().mockResolvedValue({ success: true })
	const mockUseSession = vi.fn().mockReturnValue({ data: null, isPending: false })
	const mockGetSession = vi.fn().mockResolvedValue({ data: null })
	const mockRequestPasswordReset = vi.fn().mockResolvedValue({ success: true })
	const mockResetPassword = vi.fn().mockResolvedValue({ success: true })
	const mockUpdateUser = vi.fn().mockResolvedValue({ success: true })
	const mockChangePassword = vi.fn().mockResolvedValue({ success: true })

	const mockAuthClient = {
		signIn: mockSignIn,
		signUp: mockSignUp,
		signOut: mockSignOut,
		useSession: mockUseSession,
		getSession: mockGetSession,
		requestPasswordReset: mockRequestPasswordReset,
		resetPassword: mockResetPassword,
		updateUser: mockUpdateUser,
		changePassword: mockChangePassword,
	}

	return { mockAuthClient }
})

vi.mock('better-auth/react', () => ({
	createAuthClient: vi.fn(() => mockAuthClient),
}))

// Import after mocking
import * as authIndex from '../index'

describe('Auth Package Index Exports', () => {
	describe('Server-side exports', () => {
		it('exports createAuth function', () => {
			expect(authIndex.createAuth).toBeDefined()
			expect(typeof authIndex.createAuth).toBe('function')
		})

		it('exports getOAuthProviders function', () => {
			expect(authIndex.getOAuthProviders).toBeDefined()
			expect(typeof authIndex.getOAuthProviders).toBe('function')
		})
	})

	describe('Client-side exports', () => {
		it('exports createHareAuthClient function', () => {
			expect(authIndex.createHareAuthClient).toBeDefined()
			expect(typeof authIndex.createHareAuthClient).toBe('function')
		})

		it('exports authClient instance', () => {
			expect(authIndex.authClient).toBeDefined()
		})

		it('exports signIn method', () => {
			expect(authIndex.signIn).toBeDefined()
		})

		it('exports signUp method', () => {
			expect(authIndex.signUp).toBeDefined()
		})

		it('exports signOut method', () => {
			expect(authIndex.signOut).toBeDefined()
		})

		it('exports useSession hook', () => {
			expect(authIndex.useSession).toBeDefined()
		})

		it('exports getSession method', () => {
			expect(authIndex.getSession).toBeDefined()
		})

		it('exports signInWithGoogle function', () => {
			expect(authIndex.signInWithGoogle).toBeDefined()
			expect(typeof authIndex.signInWithGoogle).toBe('function')
		})

		it('exports signInWithGitHub function', () => {
			expect(authIndex.signInWithGitHub).toBeDefined()
			expect(typeof authIndex.signInWithGitHub).toBe('function')
		})

		it('exports updateUser function', () => {
			expect(authIndex.updateUser).toBeDefined()
			expect(typeof authIndex.updateUser).toBe('function')
		})

		it('exports changePassword function', () => {
			expect(authIndex.changePassword).toBeDefined()
			expect(typeof authIndex.changePassword).toBe('function')
		})
	})

	describe('Type exports (compile-time check)', () => {
		it('Auth type is exported correctly', () => {
			// This test validates that the type can be used
			// If the type wasn't exported, this would fail at compile time
			const mockD1 = {} as D1Database
			const auth = authIndex.createAuth({
				d1: mockD1,
				env: {
					BETTER_AUTH_SECRET: 'test-secret-32-chars-long-here!!',
					APP_URL: 'http://localhost:3000',
				},
			})

			// Type assertion to ensure Auth type exists
			const typedAuth: authIndex.Auth = auth
			expect(typedAuth).toBeDefined()
		})

		it('AuthServerEnv type is exported correctly', () => {
			// This validates the AuthServerEnv type is properly exported
			const env: authIndex.AuthServerEnv = {
				BETTER_AUTH_SECRET: 'test-secret',
				APP_URL: 'http://localhost:3000',
				GOOGLE_CLIENT_ID: 'optional',
				GOOGLE_CLIENT_SECRET: 'optional',
				GITHUB_CLIENT_ID: 'optional',
				GITHUB_CLIENT_SECRET: 'optional',
				RESEND_API_KEY: 'optional',
				EMAIL_FROM: 'optional',
				APP_NAME: 'optional',
			}
			expect(env.BETTER_AUTH_SECRET).toBe('test-secret')
		})

		it('CreateAuthOptions type is exported correctly', () => {
			// This validates the CreateAuthOptions type is properly exported
			const mockD1 = {} as D1Database
			const options: authIndex.CreateAuthOptions = {
				d1: mockD1,
				env: {
					BETTER_AUTH_SECRET: 'test-secret',
					APP_URL: 'http://localhost:3000',
				},
			}
			expect(options.d1).toBeDefined()
			expect(options.env).toBeDefined()
		})

		it('CreateAuthClientOptions type is exported correctly', () => {
			// This validates the CreateAuthClientOptions type is properly exported
			const options: authIndex.CreateAuthClientOptions = {
				baseURL: 'http://localhost:3000',
			}
			expect(options.baseURL).toBe('http://localhost:3000')
		})
	})

	describe('Export completeness', () => {
		it('exports all expected server functions', () => {
			const serverExports = ['createAuth', 'getOAuthProviders']
			for (const exportName of serverExports) {
				expect(authIndex).toHaveProperty(exportName)
			}
		})

		it('exports all expected client functions', () => {
			const clientExports = [
				'createHareAuthClient',
				'authClient',
				'signIn',
				'signUp',
				'signOut',
				'useSession',
				'getSession',
				'signInWithGoogle',
				'signInWithGitHub',
				'updateUser',
				'changePassword',
			]
			for (const exportName of clientExports) {
				expect(authIndex).toHaveProperty(exportName)
			}
		})
	})
})
