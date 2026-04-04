import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Context } from 'hono'
import type { HonoEnv } from '@hare/types'

// Mock Hono cookie functions — use vi.hoisted to avoid hoisting issues with Workers pool
const { mockedGetCookie, mockedSetCookie } = vi.hoisted(() => ({
	mockedGetCookie: vi.fn(),
	mockedSetCookie: vi.fn(),
}))

vi.mock('hono/cookie', () => ({
	getCookie: mockedGetCookie,
	setCookie: mockedSetCookie,
}))

const { csrfProtection, generateCsrfToken, getCsrfToken, setCsrfCookie, validateCsrfToken } =
	await import('../csrf')

// Helper to create mock context
function createMockContext(overrides: {
	method?: string
	headers?: Record<string, string>
	cookieToken?: string | undefined
} = {}): Context<HonoEnv> {
	const {
		method = 'GET',
		headers = {},
		cookieToken = undefined,
	} = overrides

	const mockReq = {
		method,
		header: vi.fn((name: string) => {
			const normalizedHeaders = Object.fromEntries(
				Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
			)
			return normalizedHeaders[name.toLowerCase()]
		}),
		path: '/test',
	}

	const mockContext = {
		req: mockReq,
		json: vi.fn().mockReturnValue(new Response()),
	} as unknown as Context<HonoEnv>

	// Set up cookie mock for this context
	mockedGetCookie.mockImplementation((_c, name) => {
		if (name === '__Host-csrf') {
			return cookieToken
		}
		return undefined
	})

	return mockContext
}

describe('CSRF Protection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('generateCsrfToken', () => {
		it('generates a token', () => {
			const token = generateCsrfToken()

			expect(token).toBeDefined()
			expect(typeof token).toBe('string')
			expect(token.length).toBeGreaterThan(0)
		})

		it('generates URL-safe tokens (no +, /, =)', () => {
			// Generate multiple tokens to increase chance of catching issues
			for (let i = 0; i < 100; i++) {
				const token = generateCsrfToken()

				expect(token).not.toContain('+')
				expect(token).not.toContain('/')
				expect(token).not.toContain('=')
			}
		})

		it('generates unique tokens', () => {
			const tokens = new Set<string>()
			for (let i = 0; i < 100; i++) {
				tokens.add(generateCsrfToken())
			}

			// All tokens should be unique
			expect(tokens.size).toBe(100)
		})

		it('generates tokens of consistent length', () => {
			const tokens: string[] = []
			for (let i = 0; i < 10; i++) {
				tokens.push(generateCsrfToken())
			}

			// All tokens should have same length (base64 encoding of 32 bytes with URL-safe chars)
			const lengths = new Set(tokens.map((t) => t.length))
			expect(lengths.size).toBe(1)
		})
	})

	describe('getCsrfToken', () => {
		it('returns existing token from cookie', () => {
			const existingToken = 'existing-csrf-token'
			const context = createMockContext({ cookieToken: existingToken })

			const token = getCsrfToken(context)

			expect(token).toBe(existingToken)
			expect(mockedSetCookie).not.toHaveBeenCalled()
		})

		it('generates and sets new token when cookie is missing', () => {
			const context = createMockContext({ cookieToken: undefined })

			const token = getCsrfToken(context)

			expect(token).toBeDefined()
			expect(mockedSetCookie).toHaveBeenCalledWith(
				context,
				'__Host-csrf',
				token,
				expect.objectContaining({
					httpOnly: true,
					secure: true,
					sameSite: 'Strict',
					path: '/',
					maxAge: 86400, // 24 hours
				}),
			)
		})
	})

	describe('validateCsrfToken', () => {
		it('returns true when cookie and header tokens match', () => {
			const token = 'valid-csrf-token'
			const context = createMockContext({
				cookieToken: token,
				headers: { 'X-CSRF-Token': token },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(true)
		})

		it('returns false when cookie token is missing', () => {
			const context = createMockContext({
				cookieToken: undefined,
				headers: { 'X-CSRF-Token': 'some-token' },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})

		it('returns false when header token is missing', () => {
			const context = createMockContext({
				cookieToken: 'some-token',
				headers: {},
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})

		it('returns false when tokens do not match', () => {
			const context = createMockContext({
				cookieToken: 'token-1',
				headers: { 'X-CSRF-Token': 'token-2' },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})

		it('returns false when both tokens are missing', () => {
			const context = createMockContext({
				cookieToken: undefined,
				headers: {},
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})

		it('uses timing-safe comparison', () => {
			// Test that similar but different tokens are rejected
			const baseToken = 'abcdefghijklmnopqrstuvwxyz123456'
			const slightlyDifferent = 'abcdefghijklmnopqrstuvwxyz123457'

			const context = createMockContext({
				cookieToken: baseToken,
				headers: { 'X-CSRF-Token': slightlyDifferent },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})
	})

	describe('csrfProtection middleware', () => {
		it('allows GET requests without token', async () => {
			const context = createMockContext({ method: 'GET' })
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
			expect(context.json).not.toHaveBeenCalled()
		})

		it('allows HEAD requests without token', async () => {
			const context = createMockContext({ method: 'HEAD' })
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('allows OPTIONS requests without token', async () => {
			const context = createMockContext({ method: 'OPTIONS' })
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('validates token for POST requests', async () => {
			const token = 'valid-token'
			const context = createMockContext({
				method: 'POST',
				cookieToken: token,
				headers: { 'X-CSRF-Token': token },
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('validates token for PUT requests', async () => {
			const token = 'valid-token'
			const context = createMockContext({
				method: 'PUT',
				cookieToken: token,
				headers: { 'X-CSRF-Token': token },
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('validates token for PATCH requests', async () => {
			const token = 'valid-token'
			const context = createMockContext({
				method: 'PATCH',
				cookieToken: token,
				headers: { 'X-CSRF-Token': token },
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('validates token for DELETE requests', async () => {
			const token = 'valid-token'
			const context = createMockContext({
				method: 'DELETE',
				cookieToken: token,
				headers: { 'X-CSRF-Token': token },
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		// CSRF validation is currently disabled until frontend implements token handling
		// These tests verify the middleware passes through all requests while disabled
		it('passes through POST request with invalid token (CSRF disabled)', async () => {
			const context = createMockContext({
				method: 'POST',
				cookieToken: 'cookie-token',
				headers: { 'X-CSRF-Token': 'wrong-token' },
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('passes through POST request with missing token (CSRF disabled)', async () => {
			const context = createMockContext({
				method: 'POST',
				cookieToken: undefined,
				headers: {},
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
		})

		it('skips CSRF validation for API key authenticated requests', async () => {
			const context = createMockContext({
				method: 'POST',
				cookieToken: undefined, // No CSRF token
				headers: { 'X-API-Key': 'hare_some-api-key' },
			})
			const next = vi.fn().mockResolvedValue(undefined)

			const middleware = csrfProtection()
			await middleware(context, next)

			expect(next).toHaveBeenCalled()
			expect(context.json).not.toHaveBeenCalled()
		})
	})

	describe('setCsrfCookie', () => {
		it('returns the CSRF token', () => {
			const existingToken = 'test-token'
			const context = createMockContext({ cookieToken: existingToken })

			const result = setCsrfCookie(context)

			expect(result).toBe(existingToken)
		})

		it('delegates to getCsrfToken', () => {
			const context = createMockContext({ cookieToken: undefined })

			const result = setCsrfCookie(context)

			// Should generate a new token when none exists
			expect(result).toBeDefined()
			expect(typeof result).toBe('string')
		})
	})

	describe('integration scenarios', () => {
		it('full flow: generate, store, validate', async () => {
			// Step 1: Generate token on GET request
			const token = generateCsrfToken()

			// Step 2: Validate on POST request with same token
			const context = createMockContext({
				method: 'POST',
				cookieToken: token,
				headers: { 'X-CSRF-Token': token },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(true)
		})

		it('rejects when attacker uses different token', async () => {
			// Legitimate token stored in cookie
			const legitimateToken = generateCsrfToken()

			// Attacker generates their own token
			const attackerToken = generateCsrfToken()

			const context = createMockContext({
				method: 'POST',
				cookieToken: legitimateToken,
				headers: { 'X-CSRF-Token': attackerToken },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})

		it('rejects replay attack with old token', async () => {
			const oldToken = 'old-token-from-previous-session'
			const currentToken = generateCsrfToken()

			const context = createMockContext({
				method: 'POST',
				cookieToken: currentToken,
				headers: { 'X-CSRF-Token': oldToken },
			})

			const result = validateCsrfToken(context)

			expect(result).toBe(false)
		})
	})
})
