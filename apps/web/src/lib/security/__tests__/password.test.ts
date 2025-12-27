import { describe, it, expect } from 'vitest'
import {
	validatePassword,
	calculatePasswordEntropy,
	generateSecurePassword,
} from '../password'

describe('validatePassword', () => {
	describe('length requirements', () => {
		it('should reject passwords shorter than minimum length', () => {
			const result = validatePassword('Abc1!@#')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must be at least 8 characters long')
		})

		it('should accept passwords at minimum length', () => {
			// Use non-sequential characters to avoid sequential check failure
			const result = validatePassword('Axbz1!@#')
			expect(result.valid).toBe(true)
		})

		it('should reject passwords longer than 128 characters', () => {
			const longPassword = 'Aa1!' + 'a'.repeat(126)
			const result = validatePassword(longPassword)
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must not exceed 128 characters')
		})

		it('should allow custom minimum length', () => {
			// Use non-sequential characters
			const result = validatePassword('Axz1!@#', { minLength: 6 })
			expect(result.valid).toBe(true)
		})
	})

	describe('character requirements', () => {
		it('should require uppercase letter by default', () => {
			const result = validatePassword('abcd1234!@#$')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must contain at least one uppercase letter')
		})

		it('should require lowercase letter by default', () => {
			const result = validatePassword('ABCD1234!@#$')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must contain at least one lowercase letter')
		})

		it('should require number by default', () => {
			const result = validatePassword('Abcdefgh!@#$')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Password must contain at least one number')
		})

		it('should require special character by default', () => {
			const result = validatePassword('Abcd12345678')
			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'Password must contain at least one special character (!@#$%^&* etc.)'
			)
		})

		it('should allow disabling requirements', () => {
			// Use non-sequential characters (avoid abc, def, etc.)
			const result = validatePassword('axbzymwn', {
				requireUppercase: false,
				requireNumber: false,
				requireSpecial: false,
			})
			expect(result.valid).toBe(true)
		})
	})

	describe('common password detection', () => {
		it('should reject common passwords', () => {
			const commonPasswords = ['password', 'password123', '12345678', 'qwerty']

			for (const pwd of commonPasswords) {
				const result = validatePassword(pwd, {
					requireUppercase: false,
					requireSpecial: false,
				})
				expect(result.errors).toContain(
					'This password is too common. Please choose a more unique password'
				)
			}
		})

		it('should detect common passwords case-insensitively', () => {
			const result = validatePassword('PASSWORD', {
				requireLowercase: false,
				requireNumber: false,
				requireSpecial: false,
			})
			expect(result.errors).toContain(
				'This password is too common. Please choose a more unique password'
			)
		})
	})

	describe('sequential character detection', () => {
		it('should detect sequential numbers', () => {
			const result = validatePassword('Test123!@#')
			expect(result.errors).toContain(
				'Password should not contain sequential characters (e.g., 123, abc)'
			)
		})

		it('should detect sequential letters', () => {
			const result = validatePassword('Testabc!1@')
			expect(result.errors).toContain(
				'Password should not contain sequential characters (e.g., 123, abc)'
			)
		})

		it('should detect reverse sequences', () => {
			const result = validatePassword('Test321!@#')
			expect(result.errors).toContain(
				'Password should not contain sequential characters (e.g., 123, abc)'
			)
		})

		it('should detect keyboard patterns', () => {
			const result = validatePassword('Testqwe!1@')
			expect(result.errors).toContain(
				'Password should not contain sequential characters (e.g., 123, abc)'
			)
		})
	})

	describe('strength scoring', () => {
		it('should score weak passwords', () => {
			const result = validatePassword('axbz', {
				requireUppercase: false,
				requireNumber: false,
				requireSpecial: false,
				minLength: 4,
				checkSequential: false,
			})
			expect(result.strength).toBe('weak')
		})

		it('should score strong passwords', () => {
			const result = validatePassword('MySecure$Password99!')
			expect(result.strength).toBe('strong')
		})

		it('should increase score for longer passwords', () => {
			const short = validatePassword('Abcd123!')
			const long = validatePassword('Abcdefghij123!')
			expect(long.score).toBeGreaterThan(short.score)
		})
	})

	describe('valid passwords', () => {
		it('should accept strong passwords', () => {
			const validPasswords = [
				'MyP@ssw0rd!',
				'Str0ng#Pass',
				'C0mplex!ty$',
				'Secure_2024!',
			]

			for (const pwd of validPasswords) {
				const result = validatePassword(pwd)
				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
			}
		})
	})
})

describe('calculatePasswordEntropy', () => {
	it('should calculate entropy for lowercase only', () => {
		const entropy = calculatePasswordEntropy('abcdefgh')
		// 8 chars * log2(26) ≈ 37.6 bits
		expect(entropy).toBeCloseTo(37.6, 0)
	})

	it('should calculate higher entropy for mixed case', () => {
		const lowerOnly = calculatePasswordEntropy('abcdefgh')
		const mixed = calculatePasswordEntropy('Abcdefgh')
		expect(mixed).toBeGreaterThan(lowerOnly)
	})

	it('should calculate higher entropy for numbers', () => {
		const noNumbers = calculatePasswordEntropy('Abcdefgh')
		const withNumbers = calculatePasswordEntropy('Abcdefg1')
		expect(withNumbers).toBeGreaterThan(noNumbers)
	})

	it('should calculate highest entropy for full charset', () => {
		const simple = calculatePasswordEntropy('password')
		const complex = calculatePasswordEntropy('P@ssw0rd')
		expect(complex).toBeGreaterThan(simple)
	})

	it('should return 0 for empty string', () => {
		const entropy = calculatePasswordEntropy('')
		expect(entropy).toBe(0)
	})
})

describe('generateSecurePassword', () => {
	it('should generate password of specified length', () => {
		const password = generateSecurePassword(20)
		expect(password).toHaveLength(20)
	})

	it('should generate password with default length of 16', () => {
		const password = generateSecurePassword()
		expect(password).toHaveLength(16)
	})

	it('should include uppercase letters', () => {
		const password = generateSecurePassword()
		expect(/[A-Z]/.test(password)).toBe(true)
	})

	it('should include lowercase letters', () => {
		const password = generateSecurePassword()
		expect(/[a-z]/.test(password)).toBe(true)
	})

	it('should include numbers', () => {
		const password = generateSecurePassword()
		expect(/\d/.test(password)).toBe(true)
	})

	it('should include special characters', () => {
		const password = generateSecurePassword()
		expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true)
	})

	it('should generate unique passwords', () => {
		const passwords = new Set<string>()
		for (let i = 0; i < 100; i++) {
			passwords.add(generateSecurePassword())
		}
		expect(passwords.size).toBe(100)
	})

	it('should pass validation', () => {
		const password = generateSecurePassword()
		const result = validatePassword(password)
		expect(result.valid).toBe(true)
	})
})
