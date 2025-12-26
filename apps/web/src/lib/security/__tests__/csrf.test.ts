import { describe, expect, it } from 'vitest'
import { generateCsrfToken, timingSafeEqual } from '../csrf'

describe('CSRF Protection', () => {
	describe('generateCsrfToken', () => {
		it('should generate a token', () => {
			const token = generateCsrfToken()

			expect(token).toBeDefined()
			expect(token.length).toBeGreaterThan(0)
		})

		it('should generate different tokens each time', () => {
			const token1 = generateCsrfToken()
			const token2 = generateCsrfToken()

			expect(token1).not.toBe(token2)
		})

		it('should generate URL-safe tokens', () => {
			const token = generateCsrfToken()

			// Should not contain + / or =
			expect(token).not.toMatch(/[+/=]/)
			// Should only contain URL-safe base64 characters
			expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
		})

		it('should generate tokens of consistent length', () => {
			const token1 = generateCsrfToken()
			const token2 = generateCsrfToken()

			expect(token1.length).toBe(token2.length)
		})
	})

	describe('timingSafeEqual', () => {
		it('should return true for equal strings', () => {
			const result = timingSafeEqual('csrf-token-123', 'csrf-token-123')
			expect(result).toBe(true)
		})

		it('should return false for different strings', () => {
			const result = timingSafeEqual('csrf-token-123', 'csrf-token-456')
			expect(result).toBe(false)
		})

		it('should return false for strings of different lengths', () => {
			const result = timingSafeEqual('short', 'longer-token')
			expect(result).toBe(false)
		})

		it('should be constant time for same-length strings', () => {
			const iterations = 1000
			const token1 = 'x'.repeat(50)
			const token2 = 'y'.repeat(50)
			const token3 = 'x'.repeat(49) + 'y'

			// Measure time for comparison where strings differ at start
			const start1 = performance.now()
			for (let i = 0; i < iterations; i++) {
				timingSafeEqual(token1, token2)
			}
			const time1 = performance.now() - start1

			// Measure time for comparison where strings differ at end
			const start2 = performance.now()
			for (let i = 0; i < iterations; i++) {
				timingSafeEqual(token1, token3)
			}
			const time2 = performance.now() - start2

			// Times should be relatively close (within 50% of each other)
			const ratio = Math.max(time1, time2) / Math.min(time1, time2)
			expect(ratio).toBeLessThan(1.5)
		})
	})
})
