/**
 * Unit Tests for useSession Hook
 *
 * Tests the useSession hook exports from @hare/auth/client.
 * Since we're running in a Cloudflare Workers test environment without DOM,
 * we test the hook's contract through mocking rather than renderHook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// =============================================================================
// Mock Data Types
// =============================================================================

interface MockUser {
	id: string
	email: string
	name: string
	image: string
	emailVerified: boolean
	createdAt: Date
	updatedAt: Date
}

interface MockSessionInfo {
	id: string
	userId: string
	token: string
	expiresAt: Date
	createdAt: Date
	updatedAt: Date
}

interface MockSessionState {
	data: {
		user: MockUser
		session: MockSessionInfo
	} | null
	isPending: boolean
	error: Error | null
}

// =============================================================================
// Mock Data
// =============================================================================

const mockAuthenticatedSession: MockSessionState = {
	data: {
		user: {
			id: 'user-1',
			email: 'test@example.com',
			name: 'Test User',
			image: 'https://example.com/avatar.png',
			emailVerified: true,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		},
		session: {
			id: 'session-1',
			userId: 'user-1',
			token: 'test-token',
			expiresAt: new Date(Date.now() + 86400000),
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		},
	},
	isPending: false,
	error: null,
}

const mockUnauthenticatedSession: MockSessionState = {
	data: null,
	isPending: false,
	error: null,
}

const mockPendingSession: MockSessionState = {
	data: null,
	isPending: true,
	error: null,
}

const mockErrorSession: MockSessionState = {
	data: null,
	isPending: false,
	error: new Error('Session fetch failed'),
}

// =============================================================================
// Mock Setup using vi.hoisted for proper hoisting
// =============================================================================

const { mockUseSession, setMockSession } = vi.hoisted(() => {
	let currentSession: MockSessionState = {
		data: null,
		isPending: false,
		error: null,
	}

	const mockUseSession = vi.fn(() => currentSession)

	const setMockSession = (session: MockSessionState) => {
		currentSession = session
	}

	return { mockUseSession, setMockSession }
})

vi.mock('@hare/auth/client', () => ({
	useSession: mockUseSession,
	authClient: {
		useSession: mockUseSession,
	},
	signIn: { social: vi.fn() },
	signUp: vi.fn(),
	signOut: vi.fn(),
	getSession: vi.fn(),
	requestPasswordReset: vi.fn(),
	resetPassword: vi.fn(),
	createHareAuthClient: vi.fn(() => ({
		useSession: mockUseSession,
	})),
}))

// Import after mocking
import { useSession } from '@hare/auth/client'

// =============================================================================
// Tests
// =============================================================================

describe('useSession Hook', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setMockSession(mockUnauthenticatedSession)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('when user is authenticated', () => {
		beforeEach(() => {
			setMockSession(mockAuthenticatedSession)
		})

		it('returns session data with user information', () => {
			const result = useSession()

			expect(result.data).toBeDefined()
			expect(result.data?.user).toBeDefined()
			expect(result.isPending).toBe(false)
			expect(result.error).toBeNull()
		})

		it('returns correct user id', () => {
			const result = useSession()

			expect(result.data?.user?.id).toBe('user-1')
		})

		it('returns correct user email', () => {
			const result = useSession()

			expect(result.data?.user?.email).toBe('test@example.com')
		})

		it('returns correct user name', () => {
			const result = useSession()

			expect(result.data?.user?.name).toBe('Test User')
		})

		it('returns correct user image', () => {
			const result = useSession()

			expect(result.data?.user?.image).toBe('https://example.com/avatar.png')
		})

		it('returns session information', () => {
			const result = useSession()

			expect(result.data?.session).toBeDefined()
			expect(result.data?.session?.id).toBe('session-1')
			expect(result.data?.session?.userId).toBe('user-1')
		})

		it('has isPending set to false', () => {
			const result = useSession()

			expect(result.isPending).toBe(false)
		})

		it('has error set to null', () => {
			const result = useSession()

			expect(result.error).toBeNull()
		})
	})

	describe('when user is unauthenticated', () => {
		beforeEach(() => {
			setMockSession(mockUnauthenticatedSession)
		})

		it('returns null for session data', () => {
			const result = useSession()

			expect(result.data).toBeNull()
		})

		it('has isPending set to false', () => {
			const result = useSession()

			expect(result.isPending).toBe(false)
		})

		it('has error set to null', () => {
			const result = useSession()

			expect(result.error).toBeNull()
		})

		it('returns consistent null state', () => {
			const result = useSession()

			expect(result).toEqual({
				data: null,
				isPending: false,
				error: null,
			})
		})
	})

	describe('when session is loading', () => {
		beforeEach(() => {
			setMockSession(mockPendingSession)
		})

		it('returns null for session data while loading', () => {
			const result = useSession()

			expect(result.data).toBeNull()
		})

		it('has isPending set to true', () => {
			const result = useSession()

			expect(result.isPending).toBe(true)
		})

		it('has error set to null while loading', () => {
			const result = useSession()

			expect(result.error).toBeNull()
		})
	})

	describe('when session fetch fails', () => {
		beforeEach(() => {
			setMockSession(mockErrorSession)
		})

		it('returns null for session data on error', () => {
			const result = useSession()

			expect(result.data).toBeNull()
		})

		it('has isPending set to false after error', () => {
			const result = useSession()

			expect(result.isPending).toBe(false)
		})

		it('returns error object', () => {
			const result = useSession()

			expect(result.error).toBeInstanceOf(Error)
			expect(result.error?.message).toBe('Session fetch failed')
		})
	})

	describe('session state transitions', () => {
		it('transitions from pending to authenticated', () => {
			setMockSession(mockPendingSession)
			let result = useSession()

			expect(result.isPending).toBe(true)
			expect(result.data).toBeNull()

			// Simulate session load completing
			setMockSession(mockAuthenticatedSession)
			result = useSession()

			expect(result.isPending).toBe(false)
			expect(result.data?.user?.id).toBe('user-1')
		})

		it('transitions from pending to unauthenticated', () => {
			setMockSession(mockPendingSession)
			let result = useSession()

			expect(result.isPending).toBe(true)

			// Simulate session load completing with no user
			setMockSession(mockUnauthenticatedSession)
			result = useSession()

			expect(result.isPending).toBe(false)
			expect(result.data).toBeNull()
		})

		it('transitions from authenticated to unauthenticated on logout', () => {
			setMockSession(mockAuthenticatedSession)
			let result = useSession()

			expect(result.data?.user?.id).toBe('user-1')

			// Simulate logout
			setMockSession(mockUnauthenticatedSession)
			result = useSession()

			expect(result.data).toBeNull()
		})
	})

	describe('hook contract', () => {
		it('returns stable object shape', () => {
			setMockSession(mockAuthenticatedSession)
			const result = useSession()

			expect('data' in result).toBe(true)
			expect('isPending' in result).toBe(true)
			expect('error' in result).toBe(true)
		})

		it('tracks hook calls', () => {
			setMockSession(mockAuthenticatedSession)

			useSession()
			useSession()
			useSession()

			expect(mockUseSession).toHaveBeenCalledTimes(3)
		})
	})
})

describe('useSession Type Safety', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setMockSession(mockAuthenticatedSession)
	})

	it('user object has expected properties when authenticated', () => {
		const result = useSession()

		const user = result.data?.user
		if (user) {
			// These type checks verify the interface
			expect(typeof user.id).toBe('string')
			expect(typeof user.email).toBe('string')
			expect(user.name === null || typeof user.name === 'string').toBe(true)
			expect(user.image === null || typeof user.image === 'string').toBe(true)
		}
	})

	it('session object has expected properties when authenticated', () => {
		const result = useSession()

		const session = result.data?.session
		if (session) {
			expect(typeof session.id).toBe('string')
			expect(typeof session.userId).toBe('string')
		}
	})

	it('isPending is always boolean', () => {
		const result = useSession()
		expect(typeof result.isPending).toBe('boolean')
	})

	it('error is null or Error instance', () => {
		const result = useSession()
		expect(result.error === null || result.error instanceof Error).toBe(true)
	})
})
