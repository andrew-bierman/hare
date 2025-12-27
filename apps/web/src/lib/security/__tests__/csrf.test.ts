import { describe, it, expect } from 'vitest'
import { generateCsrfToken } from '../csrf'

describe('generateCsrfToken', () => {
	it('should generate a non-empty token', () => {
		const token = generateCsrfToken()
		expect(token).toBeTruthy()
		expect(token.length).toBeGreaterThan(0)
	})

	it('should generate unique tokens', () => {
		const tokens = new Set<string>()
		for (let i = 0; i < 100; i++) {
			tokens.add(generateCsrfToken())
		}
		expect(tokens.size).toBe(100)
	})

	it('should generate URL-safe tokens', () => {
		const token = generateCsrfToken()
		// Should not contain +, /, or = (base64 special chars)
		expect(token).not.toMatch(/[+/=]/)
		// Should only contain URL-safe characters
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
	})

	it('should generate tokens of consistent length', () => {
		const lengths = new Set<number>()
		for (let i = 0; i < 50; i++) {
			lengths.add(generateCsrfToken().length)
		}
		// All tokens should be the same length (or very close due to base64 padding removal)
		expect(lengths.size).toBeLessThanOrEqual(2)
	})
})
