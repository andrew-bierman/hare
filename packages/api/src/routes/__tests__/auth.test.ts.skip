import { env } from 'cloudflare:test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
	}
}

// Suppress expected Better Auth APIError unhandled rejections
// Better Auth throws APIError internally for validation errors which become unhandled rejections
const originalUnhandledRejection = process.listeners('unhandledRejection')
const suppressAPIError = (reason: unknown) => {
	// Suppress expected APIError rejections from Better Auth
	if (reason && typeof reason === 'object' && 'status' in reason) {
		return // Suppress Better Auth APIError
	}
	throw reason
}

// Helper to generate unique test emails
let testCounter = 0
function generateTestEmail(): string {
	testCounter++
	return `test-${Date.now()}-${testCounter}@example.com`
}

// Helper to sign up a test user and return session cookie
async function signUpTestUser(email: string, password: string, name: string) {
	const res = await app.request(
		'/api/auth/sign-up/email',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name }),
		},
		env,
	)
	const setCookie = res.headers.get('set-cookie')
	return { res, setCookie }
}

// Helper to sign in a test user and return session cookie
async function signInTestUser(email: string, password: string) {
	const res = await app.request(
		'/api/auth/sign-in/email',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		},
		env,
	)
	const setCookie = res.headers.get('set-cookie')
	return { res, setCookie }
}

beforeAll(async () => {
	await applyMigrations(env.DB)
	process.removeAllListeners('unhandledRejection')
	process.on('unhandledRejection', suppressAPIError)
})

afterAll(() => {
	process.removeAllListeners('unhandledRejection')
	for (const listener of originalUnhandledRejection) {
		process.on('unhandledRejection', listener as (...args: unknown[]) => void)
	}
})

describe('Auth API', () => {
	describe('GET /api/auth/providers', () => {
		it('returns available OAuth providers without authentication', async () => {
			const res = await app.request('/api/auth/providers', {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				providers: { google: boolean; github: boolean }
			}
			expect(json).toHaveProperty('providers')
			expect(json.providers).toHaveProperty('google')
			expect(json.providers).toHaveProperty('github')
			// OAuth providers should be boolean values
			expect(typeof json.providers.google).toBe('boolean')
			expect(typeof json.providers.github).toBe('boolean')
		})
	})

	describe('POST /api/auth/sign-up/email', () => {
		it('creates a new user account successfully', async () => {
			const email = generateTestEmail()
			const password = 'SecurePass123!'
			const name = 'Test User'

			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password, name }),
				},
				env,
			)

			// Successful registration returns 200
			expect(res.status).toBe(200)

			const json = (await res.json()) as Record<string, unknown>
			// Better Auth returns user data on successful signup
			expect(json).toHaveProperty('user')

			// Verify user data is present
			const user = json.user as { id?: string; email?: string; name?: string }
			expect(user.email).toBe(email)
			expect(user.name).toBe(name)
			expect(user.id).toBeDefined()

			// Session cookie should be set for auto sign-in
			const setCookie = res.headers.get('set-cookie')
			expect(setCookie).toBeTruthy()
		})

		it('rejects duplicate email registration', async () => {
			const email = generateTestEmail()
			const password = 'SecurePass123!'
			const name = 'Test User'

			// First registration should succeed
			const firstRes = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password, name }),
				},
				env,
			)
			expect(firstRes.status).toBe(200)

			// Second registration with same email should fail
			const secondRes = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password, name: 'Another User' }),
				},
				env,
			)

			// Better Auth returns 422 for duplicate email
			expect(secondRes.status).toBe(422)
		})

		it('rejects invalid email format', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'invalid-email',
						password: 'SecurePass123!',
						name: 'Test User',
					}),
				},
				env,
			)
			// Should fail validation for invalid email format
			expect(res.status >= 400).toBe(true)
		})

		it('rejects weak password (too short)', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: generateTestEmail(),
						password: '123', // Too short (less than 8 characters)
						name: 'Test User',
					}),
				},
				env,
			)
			// Should fail validation for weak password
			expect(res.status >= 400).toBe(true)
		})

		it('rejects missing required fields', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Should fail validation for missing fields
			expect(res.status >= 400).toBe(true)
		})

		it('rejects request with missing name field', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: generateTestEmail(),
						password: 'SecurePass123!',
						// name is missing
					}),
				},
				env,
			)
			// Should fail for missing name
			expect(res.status >= 400).toBe(true)
		})
	})

	describe('POST /api/auth/sign-in/email', () => {
		it('returns session for valid credentials', async () => {
			// First create a user
			const email = generateTestEmail()
			const password = 'SecurePass123!'
			const name = 'Login Test User'

			await signUpTestUser(email, password, name)

			// Now sign in with the same credentials
			const { res, setCookie } = await signInTestUser(email, password)

			expect(res.status).toBe(200)

			const json = (await res.json()) as Record<string, unknown>
			// Better Auth returns user data on successful sign-in
			expect(json).toHaveProperty('user')

			const user = json.user as { id?: string; email?: string; name?: string }
			expect(user.email).toBe(email)
			expect(user.name).toBe(name)

			// Session cookie should be set
			expect(setCookie).toBeTruthy()
		})

		it('returns 401 for invalid credentials', async () => {
			// Create a user first
			const email = generateTestEmail()
			const password = 'SecurePass123!'
			const name = 'Auth Test User'

			await signUpTestUser(email, password, name)

			// Try to sign in with wrong password
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						password: 'WrongPassword123!',
					}),
				},
				env,
			)

			// Better Auth returns 401 for invalid credentials
			expect(res.status).toBe(401)
		})

		it('returns error for non-existent user', async () => {
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'nonexistent@example.com',
						password: 'SomePassword123!',
					}),
				},
				env,
			)
			// Should return auth error (401 or 400)
			expect(res.status >= 400).toBe(true)
		})

		it('returns error for invalid email format', async () => {
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'invalid-email',
						password: 'testpassword123',
					}),
				},
				env,
			)
			// Better Auth typically returns 400 or validation error for invalid input
			expect(res.status >= 400).toBe(true)
		})

		it('returns error for missing password', async () => {
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'test@example.com',
					}),
				},
				env,
			)
			// Should fail validation
			expect(res.status >= 400).toBe(true)
		})
	})

	describe('GET /api/auth/get-session', () => {
		it('returns session for authenticated user', async () => {
			// Create and sign in a user
			const email = generateTestEmail()
			const password = 'SecurePass123!'
			const name = 'Session Test User'

			const { setCookie } = await signUpTestUser(email, password, name)

			// Request session with the auth cookie
			const res = await app.request(
				'/api/auth/get-session',
				{
					headers: setCookie ? { Cookie: setCookie } : {},
				},
				env,
			)

			expect(res.status).toBe(200)

			const json = (await res.json()) as Record<string, unknown>
			// Authenticated requests should return session and user
			expect(json).toHaveProperty('session')
			expect(json).toHaveProperty('user')

			// Session should not be null for authenticated user
			expect(json.session).not.toBeNull()
			expect(json.user).not.toBeNull()

			const user = json.user as { email?: string; name?: string }
			expect(user.email).toBe(email)
		})

		it('returns null/empty session for unauthenticated request', async () => {
			const res = await app.request('/api/auth/get-session', {}, env)

			expect(res.status).toBe(200)

			const json = await res.json()
			// Unauthenticated requests should either return null, empty object, or object with null session
			// Better Auth may return null, { session: null, user: null }, or just empty object
			if (json === null) {
				expect(json).toBeNull()
			} else if (typeof json === 'object' && json !== null && 'session' in json) {
				expect((json as Record<string, unknown>).session).toBeNull()
			}
			// If json is an empty object or doesn't have session, that's also acceptable for unauthenticated
		})
	})

	describe('POST /api/auth/sign-out', () => {
		it('clears session for authenticated user', async () => {
			// Create and sign in a user
			const email = generateTestEmail()
			const password = 'SecurePass123!'
			const name = 'SignOut Test User'

			const { setCookie } = await signUpTestUser(email, password, name)

			// Sign out with the auth cookie
			const signOutRes = await app.request(
				'/api/auth/sign-out',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(setCookie ? { Cookie: setCookie } : {}),
					},
				},
				env,
			)

			// Sign out should succeed
			expect(signOutRes.status).toBe(200)

			// After sign out, verify session is no longer valid
			// Try to get session with the same cookie - it should be invalid now
			const sessionCheckRes = await app.request(
				'/api/auth/get-session',
				{
					headers: setCookie ? { Cookie: setCookie } : {},
				},
				env,
			)

			const sessionJson = await sessionCheckRes.json()
			// Session should be null after sign-out
			// Better Auth may return null, or { session: null, user: null }
			if (sessionJson === null) {
				expect(sessionJson).toBeNull()
			} else if (typeof sessionJson === 'object' && sessionJson !== null && 'session' in sessionJson) {
				expect((sessionJson as Record<string, unknown>).session).toBeNull()
			}
		})

		it('handles sign-out request without session gracefully', async () => {
			const res = await app.request(
				'/api/auth/sign-out',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				},
				env,
			)
			// Should not crash, may return success or error depending on implementation
			expect([200, 401, 400].includes(res.status)).toBe(true)
		})
	})

	describe('OAuth Routes', () => {
		it('GET /api/auth/sign-in/google returns 404 when not configured', async () => {
			const res = await app.request('/api/auth/sign-in/google', {}, env)
			// Returns 404 when OAuth provider is not configured
			expect(res.status).toBe(404)
		})

		it('GET /api/auth/sign-in/github returns 404 when not configured', async () => {
			const res = await app.request('/api/auth/sign-in/github', {}, env)
			// Returns 404 when OAuth provider is not configured
			expect(res.status).toBe(404)
		})
	})
})
