import { describe, expect, it } from 'vitest'
import {
	calculatePasswordEntropy,
	generateSecurePassword,
	validatePassword,
} from '../password'

describe('Password Validation', () => {
	describe('validatePassword', () => {
		it('should accept a strong password', () => {
			const result = validatePassword('SecureP@ssw0rd!')
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
			expect(result.strength).toBe('strong')
		})

		it('should reject password shorter than 8 characters', () => {
			const result = validatePassword('Short1!')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must be at least 8 characters long')
		})

		it('should reject password without uppercase', () => {
			const result = validatePassword('password123!')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must contain at least one uppercase letter')
		})

		it('should reject password without lowercase', () => {
			const result = validatePassword('PASSWORD123!')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must contain at least one lowercase letter')
		})

		it('should reject password without number', () => {
			const result = validatePassword('SecurePassword!')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must contain at least one number')
		})

		it('should reject password without special character', () => {
			const result = validatePassword('SecurePassword123')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'Password must contain at least one special character (!@#$%^&* etc.)',
			)
		})

		it('should reject common passwords', () => {
			const result = validatePassword('password123')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'This password is too common. Please choose a more unique password',
			)
		})

		it('should reject passwords with sequential characters', () => {
			const result = validatePassword('Abcd1234!')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'Password should not contain sequential characters (e.g., 123, abc)',
			)
		})

		it('should reject password longer than 128 characters', () => {
			const longPassword = 'A1!' + 'x'.repeat(130)
			const result = validatePassword(longPassword)
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must not exceed 128 characters')
		})

		it('should assign correct strength scores', () => {
			const weak = validatePassword('Pass123!') // Might have sequential
			const good = validatePassword('Tr0ng$ecure')
			const strong = validatePassword('V3ry$ecur3P@ssw0rd!')

			expect(['weak', 'fair', 'good']).toContain(weak.strength)
			expect(['good', 'strong']).toContain(good.strength)
			expect(strong.strength).toBe('strong')
		})

		it('should allow customizing requirements', () => {
			const result = validatePassword('password', {
				minLength: 6,
				requireUppercase: false,
				requireNumber: false,
				requireSpecial: false,
				checkCommon: false,
			})
			expect(result.valid).toBe(true)
		})
	})

	describe('calculatePasswordEntropy', () => {
		it('should calculate entropy for various passwords', () => {
			const entropy1 = calculatePasswordEntropy('abc')
			const entropy2 = calculatePasswordEntropy('Abc123')
			const entropy3 = calculatePasswordEntropy('Abc123!@#')

			expect(entropy1).toBeLessThan(entropy2)
			expect(entropy2).toBeLessThan(entropy3)
		})

		it('should return higher entropy for longer passwords', () => {
			const short = calculatePasswordEntropy('Abc1!')
			const long = calculatePasswordEntropy('Abc123!@#ThisIsLonger')

			expect(long).toBeGreaterThan(short)
		})
	})

	describe('generateSecurePassword', () => {
		it('should generate password of specified length', () => {
			const password = generateSecurePassword(16)
			expect(password).toHaveLength(16)
		})

		it('should generate password with all required character types', () => {
			const password = generateSecurePassword(20)

			expect(password).toMatch(/[A-Z]/) // uppercase
			expect(password).toMatch(/[a-z]/) // lowercase
			expect(password).toMatch(/[0-9]/) // number
			expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/) // special
		})

		it('should generate different passwords each time', () => {
			const password1 = generateSecurePassword()
			const password2 = generateSecurePassword()

			expect(password1).not.toBe(password2)
		})

		it('should generate valid passwords', () => {
			const password = generateSecurePassword(12)
			const result = validatePassword(password)

			expect(result.valid).toBe(true)
		})
	})
})
