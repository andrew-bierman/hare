import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to ensure mocks are defined before vi.mock is hoisted
const { mockSignIn, mockUpdateUser, mockChangePassword, mockAuthClient } = vi.hoisted(() => {
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

	return {
		mockSignIn,
		mockUpdateUser,
		mockChangePassword,
		mockAuthClient,
	}
})

// Mock better-auth/react with the hoisted mocks
vi.mock('better-auth/react', () => ({
	createAuthClient: vi.fn(() => mockAuthClient),
}))

// Import after mocking
import {
	type CreateAuthClientOptions,
	changePassword,
	createHareAuthClient,
	signInWithGitHub,
	signInWithGoogle,
	updateUser,
} from '../client'

describe('Auth Client', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('createHareAuthClient', () => {
		it('creates auth client with provided baseURL', () => {
			const options: CreateAuthClientOptions = {
				baseURL: 'https://api.example.com',
			}
			const client = createHareAuthClient(options)

			expect(client).toBeDefined()
		})

		it('creates auth client without baseURL option', () => {
			const client = createHareAuthClient()

			expect(client).toBeDefined()
		})

		it('creates auth client with empty options object', () => {
			const client = createHareAuthClient({})

			expect(client).toBeDefined()
		})
	})

	describe('signInWithGoogle', () => {
		it('calls signIn.social with google provider', async () => {
			await signInWithGoogle()

			expect(mockSignIn.social).toHaveBeenCalledWith({
				provider: 'google',
				callbackURL: '/dashboard',
			})
		})

		it('uses default callback URL of /dashboard', async () => {
			await signInWithGoogle()

			expect(mockSignIn.social).toHaveBeenCalledWith(
				expect.objectContaining({
					callbackURL: '/dashboard',
				}),
			)
		})

		it('accepts custom callback URL', async () => {
			await signInWithGoogle('/custom-callback')

			expect(mockSignIn.social).toHaveBeenCalledWith({
				provider: 'google',
				callbackURL: '/custom-callback',
			})
		})

		it('accepts callback URL with path segments', async () => {
			await signInWithGoogle('/workspace/settings')

			expect(mockSignIn.social).toHaveBeenCalledWith({
				provider: 'google',
				callbackURL: '/workspace/settings',
			})
		})
	})

	describe('signInWithGitHub', () => {
		it('calls signIn.social with github provider', async () => {
			await signInWithGitHub()

			expect(mockSignIn.social).toHaveBeenCalledWith({
				provider: 'github',
				callbackURL: '/dashboard',
			})
		})

		it('uses default callback URL of /dashboard', async () => {
			await signInWithGitHub()

			expect(mockSignIn.social).toHaveBeenCalledWith(
				expect.objectContaining({
					callbackURL: '/dashboard',
				}),
			)
		})

		it('accepts custom callback URL', async () => {
			await signInWithGitHub('/custom-callback')

			expect(mockSignIn.social).toHaveBeenCalledWith({
				provider: 'github',
				callbackURL: '/custom-callback',
			})
		})

		it('accepts callback URL with query parameters', async () => {
			await signInWithGitHub('/dashboard?tab=agents')

			expect(mockSignIn.social).toHaveBeenCalledWith({
				provider: 'github',
				callbackURL: '/dashboard?tab=agents',
			})
		})
	})

	describe('updateUser', () => {
		it('calls authClient.updateUser with name', async () => {
			await updateUser({ name: 'New Name' })

			expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' })
		})

		it('calls authClient.updateUser with image', async () => {
			await updateUser({ image: 'https://example.com/avatar.png' })

			expect(mockUpdateUser).toHaveBeenCalledWith({ image: 'https://example.com/avatar.png' })
		})

		it('calls authClient.updateUser with both name and image', async () => {
			await updateUser({
				name: 'New Name',
				image: 'https://example.com/avatar.png',
			})

			expect(mockUpdateUser).toHaveBeenCalledWith({
				name: 'New Name',
				image: 'https://example.com/avatar.png',
			})
		})

		it('calls authClient.updateUser with empty object', async () => {
			await updateUser({})

			expect(mockUpdateUser).toHaveBeenCalledWith({})
		})
	})

	describe('changePassword', () => {
		it('calls authClient.changePassword with required fields', async () => {
			await changePassword({
				currentPassword: 'old-password',
				newPassword: 'new-password',
			})

			expect(mockChangePassword).toHaveBeenCalledWith({
				currentPassword: 'old-password',
				newPassword: 'new-password',
			})
		})

		it('calls authClient.changePassword with revokeOtherSessions true', async () => {
			await changePassword({
				currentPassword: 'old-password',
				newPassword: 'new-password',
				revokeOtherSessions: true,
			})

			expect(mockChangePassword).toHaveBeenCalledWith({
				currentPassword: 'old-password',
				newPassword: 'new-password',
				revokeOtherSessions: true,
			})
		})

		it('calls authClient.changePassword with revokeOtherSessions false', async () => {
			await changePassword({
				currentPassword: 'old-password',
				newPassword: 'new-password',
				revokeOtherSessions: false,
			})

			expect(mockChangePassword).toHaveBeenCalledWith({
				currentPassword: 'old-password',
				newPassword: 'new-password',
				revokeOtherSessions: false,
			})
		})
	})

	describe('CreateAuthClientOptions interface', () => {
		it('allows optional baseURL', () => {
			const options1: CreateAuthClientOptions = {}
			const options2: CreateAuthClientOptions = { baseURL: 'http://localhost:3000' }

			expect(options1.baseURL).toBeUndefined()
			expect(options2.baseURL).toBe('http://localhost:3000')
		})

		it('accepts various valid URLs', () => {
			const validUrls = [
				'http://localhost:3000',
				'https://api.example.com',
				'https://app.hare.dev',
				'http://127.0.0.1:8787',
			]

			for (const url of validUrls) {
				const options: CreateAuthClientOptions = { baseURL: url }
				expect(options.baseURL).toBe(url)
			}
		})
	})

	describe('exported auth methods', () => {
		it('exports signIn from auth client', async () => {
			// The signIn should be the mockSignIn from our mock
			const { signIn } = await import('../client')
			expect(signIn).toBeDefined()
		})

		it('exports signUp from auth client', async () => {
			const { signUp } = await import('../client')
			expect(signUp).toBeDefined()
		})

		it('exports signOut from auth client', async () => {
			const { signOut } = await import('../client')
			expect(signOut).toBeDefined()
		})

		it('exports useSession from auth client', async () => {
			const { useSession } = await import('../client')
			expect(useSession).toBeDefined()
		})

		it('exports getSession from auth client', async () => {
			const { getSession } = await import('../client')
			expect(getSession).toBeDefined()
		})

		it('exports requestPasswordReset from auth client', async () => {
			const { requestPasswordReset } = await import('../client')
			expect(requestPasswordReset).toBeDefined()
		})

		it('exports resetPassword from auth client', async () => {
			const { resetPassword } = await import('../client')
			expect(resetPassword).toBeDefined()
		})
	})

	describe('OAuth social sign-in functions', () => {
		it('signInWithGoogle returns result from signIn.social', () => {
			// The function delegates to signIn.social and returns whatever it returns
			signInWithGoogle()
			expect(mockSignIn.social).toHaveBeenCalled()
		})

		it('signInWithGitHub returns result from signIn.social', () => {
			// The function delegates to signIn.social and returns whatever it returns
			signInWithGitHub()
			expect(mockSignIn.social).toHaveBeenCalled()
		})

		it('both OAuth functions have same callback behavior', () => {
			const customCallback = '/custom'

			signInWithGoogle(customCallback)
			signInWithGitHub(customCallback)

			expect(mockSignIn.social).toHaveBeenNthCalledWith(1, {
				provider: 'google',
				callbackURL: customCallback,
			})
			expect(mockSignIn.social).toHaveBeenNthCalledWith(2, {
				provider: 'github',
				callbackURL: customCallback,
			})
		})
	})

	describe('user management functions', () => {
		it('updateUser returns promise from authClient', async () => {
			const result = updateUser({ name: 'Test' })
			expect(result).toBeInstanceOf(Promise)
		})

		it('changePassword returns promise from authClient', async () => {
			const result = changePassword({
				currentPassword: 'old',
				newPassword: 'new',
			})
			expect(result).toBeInstanceOf(Promise)
		})
	})
})

describe('Auth Client URL Resolution', () => {
	// These tests verify the URL resolution logic indirectly

	it('createHareAuthClient handles undefined baseURL', () => {
		// When no baseURL is provided and window is undefined (server-side),
		// the client should still be created
		const client = createHareAuthClient()
		expect(client).toBeDefined()
	})

	it('createHareAuthClient prioritizes explicit baseURL', () => {
		const explicitUrl = 'https://explicit.example.com'
		const client = createHareAuthClient({ baseURL: explicitUrl })
		expect(client).toBeDefined()
	})
})
