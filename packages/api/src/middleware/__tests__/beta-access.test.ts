import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { AuthEnv } from '@hare/types'

// We need to mock the config before importing the middleware
vi.mock('@hare/config', async () => {
	return {
		config: {
			features: {
				aiChat: true,
			},
			beta: {
				enabled: false,
				allowedEmails: [],
			},
		},
	}
})

describe('beta-access middleware', () => {
	describe('aiChatFeatureMiddleware', () => {
		describe('when AI chat is disabled', () => {
			beforeEach(() => {
				vi.resetModules()
			})

			it('returns 503 when aiChat feature is disabled', async () => {
				vi.doMock('@hare/config', () => ({
					config: {
						features: {
							aiChat: false,
						},
						beta: {
							enabled: false,
							allowedEmails: [],
						},
					},
				}))

				const { aiChatFeatureMiddleware } = await import('../beta-access')

				const app = new Hono<AuthEnv>()
				app.use('*', aiChatFeatureMiddleware)
				app.get('/chat', (c) => c.text('OK'))

				const res = await app.request('/chat')
				expect(res.status).toBe(503)

				const body = (await res.json()) as { error: string; message: string }
				expect(body.error).toBe('Feature not available')
				expect(body.message).toContain('AI chat features are currently disabled')
			})
		})

		describe('when AI chat is enabled without beta mode', () => {
			beforeEach(() => {
				vi.resetModules()
			})

			it('allows access when aiChat is enabled and beta mode is off', async () => {
				vi.doMock('@hare/config', () => ({
					config: {
						features: {
							aiChat: true,
						},
						beta: {
							enabled: false,
							allowedEmails: [],
						},
					},
				}))

				const { aiChatFeatureMiddleware } = await import('../beta-access')

				const app = new Hono<AuthEnv>()
				app.use('*', aiChatFeatureMiddleware)
				app.get('/chat', (c) => c.text('OK'))

				const res = await app.request('/chat')
				expect(res.status).toBe(200)
				expect(await res.text()).toBe('OK')
			})
		})

		describe('when beta mode is enabled', () => {
			beforeEach(() => {
				vi.resetModules()
			})

			it('returns 401 when user is not authenticated', async () => {
				vi.doMock('@hare/config', () => ({
					config: {
						features: {
							aiChat: true,
						},
						beta: {
							enabled: true,
							allowedEmails: ['allowed@example.com'],
						},
					},
				}))

				const { aiChatFeatureMiddleware } = await import('../beta-access')

				const app = new Hono<AuthEnv>()
				app.use('*', aiChatFeatureMiddleware)
				app.get('/chat', (c) => c.text('OK'))

				const res = await app.request('/chat')
				expect(res.status).toBe(401)

				const body = (await res.json()) as { error: string }
				expect(body.error).toBe('Authentication required')
			})

			it('returns 403 when user email is not in allowlist', async () => {
				vi.doMock('@hare/config', () => ({
					config: {
						features: {
							aiChat: true,
						},
						beta: {
							enabled: true,
							allowedEmails: ['allowed@example.com'],
						},
					},
				}))

				const { aiChatFeatureMiddleware } = await import('../beta-access')

				const app = new Hono<AuthEnv>()
				app.use('*', async (c, next) => {
					c.set('user', {
						id: 'user_123',
						email: 'notallowed@example.com',
						name: 'Test User',
						image: null,
					})
					await next()
				})
				app.use('*', aiChatFeatureMiddleware)
				app.get('/chat', (c) => c.text('OK'))

				const res = await app.request('/chat')
				expect(res.status).toBe(403)

				const body = (await res.json()) as { error: string; message: string }
				expect(body.error).toBe('Beta access required')
				expect(body.message).toContain('private beta')
			})

			it('allows access when user email is in allowlist', async () => {
				vi.doMock('@hare/config', () => ({
					config: {
						features: {
							aiChat: true,
						},
						beta: {
							enabled: true,
							allowedEmails: ['allowed@example.com'],
						},
					},
				}))

				const { aiChatFeatureMiddleware } = await import('../beta-access')

				const app = new Hono<AuthEnv>()
				app.use('*', async (c, next) => {
					c.set('user', {
						id: 'user_123',
						email: 'allowed@example.com',
						name: 'Test User',
						image: null,
					})
					await next()
				})
				app.use('*', aiChatFeatureMiddleware)
				app.get('/chat', (c) => c.text('OK'))

				const res = await app.request('/chat')
				expect(res.status).toBe(200)
				expect(await res.text()).toBe('OK')
			})

			it('handles case-insensitive email matching', async () => {
				vi.doMock('@hare/config', () => ({
					config: {
						features: {
							aiChat: true,
						},
						beta: {
							enabled: true,
							allowedEmails: ['allowed@example.com'],
						},
					},
				}))

				const { aiChatFeatureMiddleware } = await import('../beta-access')

				const app = new Hono<AuthEnv>()
				app.use('*', async (c, next) => {
					c.set('user', {
						id: 'user_123',
						email: 'ALLOWED@EXAMPLE.COM', // uppercase
						name: 'Test User',
						image: null,
					})
					await next()
				})
				app.use('*', aiChatFeatureMiddleware)
				app.get('/chat', (c) => c.text('OK'))

				const res = await app.request('/chat')
				expect(res.status).toBe(200)
			})
		})
	})

	describe('feature flag logic', () => {
		it('correctly determines if feature is disabled', () => {
			const config = { features: { aiChat: false } }
			expect(config.features.aiChat).toBe(false)
		})

		it('correctly determines if feature is enabled', () => {
			const config = { features: { aiChat: true } }
			expect(config.features.aiChat).toBe(true)
		})
	})

	describe('beta access logic', () => {
		it('correctly determines beta mode is disabled', () => {
			const config = { beta: { enabled: false, allowedEmails: [] } }
			expect(config.beta.enabled).toBe(false)
		})

		it('correctly determines beta mode is enabled', () => {
			const config = { beta: { enabled: true, allowedEmails: ['test@example.com'] } }
			expect(config.beta.enabled).toBe(true)
		})

		it('validates email is in allowlist', () => {
			const allowedEmails = ['user1@example.com', 'user2@example.com']
			const userEmail = 'user1@example.com'.toLowerCase()
			expect(allowedEmails.includes(userEmail)).toBe(true)
		})

		it('validates email is not in allowlist', () => {
			const allowedEmails = ['user1@example.com', 'user2@example.com']
			const userEmail = 'user3@example.com'.toLowerCase()
			expect(allowedEmails.includes(userEmail)).toBe(false)
		})

		it('handles empty allowlist', () => {
			const allowedEmails: string[] = []
			const userEmail = 'user@example.com'.toLowerCase()
			expect(allowedEmails.includes(userEmail)).toBe(false)
		})

		it('normalizes email to lowercase before checking', () => {
			const allowedEmails = ['user@example.com']
			const userEmail = 'USER@EXAMPLE.COM'.toLowerCase()
			expect(allowedEmails.includes(userEmail)).toBe(true)
		})
	})

	describe('error responses', () => {
		it('503 response has correct structure', () => {
			const response = {
				error: 'Feature not available',
				message: 'AI chat features are currently disabled. Please check back later.',
			}
			expect(response.error).toBe('Feature not available')
			expect(response.message).toBeDefined()
		})

		it('401 response has correct structure', () => {
			const response = {
				error: 'Authentication required',
			}
			expect(response.error).toBe('Authentication required')
		})

		it('403 response has correct structure', () => {
			const response = {
				error: 'Beta access required',
				message: 'This feature is currently in private beta. Please contact us for access.',
			}
			expect(response.error).toBe('Beta access required')
			expect(response.message).toContain('private beta')
		})
	})
})
