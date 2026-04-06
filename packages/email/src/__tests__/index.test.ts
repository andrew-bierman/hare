/**
 * Tests for @hare/email - Service and template export verification
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmailService, EmailService } from '../index'

// Suppress console.warn from EmailService constructor (no RESEND_API_KEY in tests)
let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
		// empty
	})
})
afterEach(() => {
	warnSpy.mockRestore()
})

describe('@hare/email exports', () => {
	it('exports createEmailService function', () => {
		expect(createEmailService).toBeDefined()
		expect(typeof createEmailService).toBe('function')
	})

	it('exports EmailService class', () => {
		expect(EmailService).toBeDefined()
		expect(typeof EmailService).toBe('function')
	})
})

describe('EmailService', () => {
	describe('constructor', () => {
		it('creates an instance without API key (dev mode)', () => {
			const service = new EmailService({})
			expect(service).toBeInstanceOf(EmailService)
		})

		it('creates an instance with custom env values', () => {
			const service = new EmailService({
				EMAIL_FROM: 'Test <test@example.com>',
				APP_NAME: 'TestApp',
				APP_URL: 'https://test.example.com',
			})
			expect(service).toBeInstanceOf(EmailService)
		})
	})

	describe('createEmailService factory', () => {
		it('returns an EmailService instance', () => {
			const service = createEmailService({})
			expect(service).toBeInstanceOf(EmailService)
		})
	})

	describe('sendPasswordReset (dev mode)', () => {
		it('returns success in dev mode without Resend API key', async () => {
			const service = createEmailService({})
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
				// empty
			})

			const result = await service.sendPasswordReset({
				to: 'user@example.com',
				resetUrl: 'https://example.com/reset?token=abc',
			})

			expect(result.success).toBe(true)
			expect(result.messageId).toBeDefined()
			// biome-ignore lint/style/noNonNullAssertion: checked by toBeDefined above
			expect(result.messageId!.startsWith('dev-')).toBe(true)

			consoleSpy.mockRestore()
		})
	})

	describe('sendWorkspaceInvitation (dev mode)', () => {
		it('returns success in dev mode without Resend API key', async () => {
			const service = createEmailService({})
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
				// empty
			})

			const result = await service.sendWorkspaceInvitation({
				to: 'invitee@example.com',
				workspaceName: 'Test Workspace',
				inviterName: 'John Doe',
				inviterEmail: 'john@example.com',
				role: 'member',
				inviteUrl: 'https://example.com/invite?token=xyz',
				expiresAt: new Date('2030-01-01'),
			})

			expect(result.success).toBe(true)
			expect(result.messageId).toBeDefined()
			// biome-ignore lint/style/noNonNullAssertion: checked by toBeDefined above
			expect(result.messageId!.startsWith('dev-')).toBe(true)

			consoleSpy.mockRestore()
		})
	})
})
